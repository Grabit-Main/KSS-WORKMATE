from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.database import get_db
from app.models.task import Task, TaskStatusLog
from app.models.project import Team, TeamMembership
from app.models.notification import Notification
from app.models.user import User
from app.schemas.task import TaskCreate, TaskResponse, StatusUpdate, ReassignRequest
from app.dependencies import get_current_user
from app.websocket.manager import manager
from app.websocket.events import (
    TASK_CREATED, TASK_STATUS_CHANGED, TASK_REASSIGNED, TASK_LOCKED, NOTIFICATION_NEW, ANALYTICS_REFRESH
)

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def _log_status(db, task, from_s, to_s, user_id, reason=None):
    log = TaskStatusLog(task_id=task.id, from_status=from_s, to_status=to_s, changed_by=user_id, reason=reason)
    db.add(log)


def _notify(db, user_id, title, message, event_type, ref_id=None):
    n = Notification(user_id=user_id, title=title, message=message, event_type=event_type, ref_id=str(ref_id) if ref_id else None)
    db.add(n)


async def _broadcast_task(task, team_id, event_type):
    data = {
        "type": event_type,
        "data": {
            "id": str(task.id),
            "title": task.title,
            "status": task.status,
            "team_id": str(team_id),
            "assigned_to": str(task.assigned_to),
            "is_locked": task.is_locked,
        }
    }
    await manager.broadcast(f"team:{team_id}", data)
    await manager.broadcast(f"task:{task.id}", data)
    await manager.broadcast("global:admins", {"type": ANALYTICS_REFRESH, "data": {}})


@router.get("", response_model=List[TaskResponse])
def list_tasks(
    project_id: Optional[UUID] = None,
    scheduled_date: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    q = db.query(Task)
    if user.role == "TM":
        # Regular members only see tasks allocated to them
        q = q.filter(Task.assigned_to == user.id)
    elif user.role == "TL":
        # TL sees tasks in teams where they are lead or assigned to them
        team_ids = db.query(TeamMembership.team_id).filter(
            TeamMembership.user_id == user.id,
            (TeamMembership.is_lead == True) | (user.role == "TL")
        ).subquery()
        q = q.filter((Task.team_id.in_(team_ids)) | (Task.assigned_to == user.id))
    elif user.role == "PM":
        from app.models.project import Team, Project
        team_ids = db.query(Team.id).join(Project).filter(Project.created_by == user.id).subquery()
        p_ids = db.query(Project.id).filter(Project.created_by == user.id).subquery()
        q = q.filter((Task.team_id.in_(team_ids)) | (Task.project_id.in_(p_ids)) | (Task.assigned_to == user.id))
    # CEO/CTO see all

    if project_id:
        # Match directly or through team's project
        team_ids = db.query(Team.id).filter(Team.project_id == project_id).subquery()
        q = q.filter((Task.project_id == project_id) | (Task.team_id.in_(team_ids)))

    if scheduled_date:
        q = q.filter(Task.scheduled_date == scheduled_date)

    return q.order_by(Task.created_at.desc()).all()


@router.post("", response_model=TaskResponse)
async def create_task(req: TaskCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    # Auto-resolve team_id and project_id if either is missing
    if not req.team_id and req.project_id:
        # Find a team associated with this project where user is lead, or any team in project
        proj_team = db.query(Team).join(TeamMembership).filter(
            Team.project_id == req.project_id,
            TeamMembership.user_id == user.id,
            (TeamMembership.is_lead == True) | (user.role == "TL")
        ).first()
        if not proj_team:
            proj_team = db.query(Team).filter(Team.project_id == req.project_id).first()
        if proj_team:
            req.team_id = proj_team.id

    if not req.team_id:
        membership = db.query(TeamMembership).filter(TeamMembership.user_id == req.assigned_to).first()
        if not membership:
            membership = db.query(TeamMembership).filter(TeamMembership.user_id == user.id).first()
        if membership:
            req.team_id = membership.team_id
        else:
            team = db.query(Team).first()
            if team:
                req.team_id = team.id

    if req.team_id and not req.project_id:
        team_obj = db.query(Team).filter(Team.id == req.team_id).first()
        if team_obj and team_obj.project_id:
            req.project_id = team_obj.project_id

    # Check authorization: Must be TL of that team, or CEO/CTO/PM
    if req.team_id:
        lead = db.query(TeamMembership).filter(
            TeamMembership.team_id == req.team_id,
            TeamMembership.user_id == user.id,
            (TeamMembership.is_lead == True) | (user.role == "TL")
        ).first()
        if not lead and user.role not in ("CEO", "CTO", "PM"):
            raise HTTPException(403, "Only Team Leads or PMs can allocate tasks")

    # Find target assignee user
    target_user = db.query(User).filter(User.id == req.assigned_to).first()
    if not target_user:
        raise HTTPException(404, "Assignee user not found")

    # Rule: No one can assign tasks to CEO or CTO
    if target_user.role in ("CEO", "CTO"):
        raise HTTPException(400, "Tasks cannot be assigned to CEO or CTO.")

    # Rule: TM cannot assign tasks to PM
    if user.role == "TM" and target_user.role == "PM":
        raise HTTPException(400, "Team Members (TM) cannot assign tasks to Project Managers (PM).")

    task = Task(**req.model_dump(), assigned_by=user.id)
    db.add(task)
    db.flush()
    if str(req.assigned_to) == str(user.id):
        log_msg = f"Task self-assigned by {user.role} {user.first_name} {user.last_name}"
    else:
        log_msg = f"Task assigned by {user.role} {user.first_name} {user.last_name}"
    _log_status(db, task, "created", "not_started", user.id, log_msg)
    _notify(db, req.assigned_to, "New Task Assigned", f"You have been allocated a new task: {req.title}", TASK_CREATED, str(task.id))
    db.commit()
    db.refresh(task)
    if req.team_id:
        await _broadcast_task(task, req.team_id, TASK_CREATED)
    await manager.send_to_user(str(req.assigned_to), {"type": NOTIFICATION_NEW, "data": {"title": "New Task Assigned", "message": f"You have been allocated a new task: {req.title}"}})
    return task


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    return task


@router.post("/{task_id}/start", response_model=TaskResponse)
@router.put("/{task_id}/start", response_model=TaskResponse)
@router.put("/{task_id}/accept", response_model=TaskResponse)
async def start_task(task_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    is_assignee = str(task.assigned_to) == str(user.id)
    is_lead = False
    if task.team_id:
        is_lead = bool(db.query(TeamMembership).filter(
            TeamMembership.team_id == task.team_id,
            TeamMembership.user_id == user.id,
            (TeamMembership.is_lead == True) | (user.role == "TL")
        ).first())
    if not is_assignee and not is_lead and user.role not in ("CEO", "CTO", "PM"):
        raise HTTPException(403, "Not authorized to start this task")
    if task.status != "not_started":
        raise HTTPException(400, f"Task cannot be started in '{task.status}' status")

    _log_status(db, task, task.status, "in_progress", user.id, f"Started by {user.first_name} {user.last_name}")
    task.status = "in_progress"

    notify_target = task.assigned_by if is_assignee else task.assigned_to
    if str(notify_target) != str(user.id):
        _notify(db, notify_target, "Task Started", f"{user.first_name} {user.last_name} started working on '{task.title}'", TASK_STATUS_CHANGED, str(task.id))
        await manager.send_to_user(str(notify_target), {"type": NOTIFICATION_NEW, "data": {"title": "Task Started", "message": f"{user.first_name} {user.last_name} started working on '{task.title}'"}})

    db.commit()
    db.refresh(task)
    if task.team_id:
        await _broadcast_task(task, task.team_id, TASK_STATUS_CHANGED)
    return task


@router.put("/{task_id}/reject", response_model=TaskResponse)
async def reject_task(task_id: UUID, req: StatusUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id, Task.assigned_to == user.id).first()
    if not task or task.status != "not_started":
        raise HTTPException(400, "Cannot reject task")
    _log_status(db, task, task.status, "blocked", user.id, req.reason)
    task.status = "blocked"
    task.reject_reason = req.reason
    _notify(db, task.assigned_by, "Task Rejected", f"Task '{task.title}' was rejected. Reason: {req.reason}", TASK_STATUS_CHANGED, task.id)
    db.commit()
    db.refresh(task)
    await _broadcast_task(task, task.team_id, TASK_STATUS_CHANGED)
    await manager.send_to_user(str(task.assigned_by), {"type": NOTIFICATION_NEW, "data": {"message": f"Task rejected: {task.title}"}})
    return task


@router.put("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(task_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id, Task.assigned_to == user.id).first()
    if not task or task.status != "in_progress":
        raise HTTPException(400, "Task must be in progress to mark complete")
    _log_status(db, task, task.status, "in_review", user.id)
    task.status = "in_review"
    _notify(db, task.assigned_by, "Task Ready for Review", f"'{task.title}' is ready for review", TASK_STATUS_CHANGED, task.id)
    db.commit()
    db.refresh(task)
    await _broadcast_task(task, task.team_id, TASK_STATUS_CHANGED)
    await manager.send_to_user(str(task.assigned_by), {"type": NOTIFICATION_NEW, "data": {"message": f"Task in review: {task.title}"}})
    return task


@router.put("/{task_id}/confirm", response_model=TaskResponse)
async def confirm_task(task_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task or task.status != "in_review":
        raise HTTPException(400, "Task must be in review to confirm")
    # Must be TL of team, or CEO/CTO/PM
    lead = db.query(TeamMembership).filter(
        TeamMembership.team_id == task.team_id,
        TeamMembership.user_id == user.id,
        (TeamMembership.is_lead == True) | (user.role == "TL")
    ).first()
    if not lead and user.role not in ("CEO", "CTO", "PM"):
        raise HTTPException(403, "Only Team Leads can confirm tasks")
    _log_status(db, task, task.status, "completed", user.id)
    task.status = "completed"
    task.is_locked = True
    _notify(db, task.assigned_to, "Task Completed!", f"'{task.title}' has been confirmed complete.", TASK_LOCKED, task.id)
    db.commit()
    db.refresh(task)
    await _broadcast_task(task, task.team_id, TASK_LOCKED)
    await manager.send_to_user(str(task.assigned_to), {"type": NOTIFICATION_NEW, "data": {"message": f"Task completed & locked: {task.title}"}})
    return task


@router.put("/{task_id}/decline", response_model=TaskResponse)
async def decline_task(task_id: UUID, req: StatusUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task or task.status != "in_review":
        raise HTTPException(400, "Task must be in review to decline")
    lead = db.query(TeamMembership).filter(
        TeamMembership.team_id == task.team_id,
        TeamMembership.user_id == user.id,
        (TeamMembership.is_lead == True) | (user.role == "TL")
    ).first()
    if not lead and user.role not in ("CEO", "CTO", "PM"):
        raise HTTPException(403, "Only Team Leads can decline tasks")
    _log_status(db, task, task.status, "in_progress", user.id, req.reason)
    task.status = "in_progress"
    task.decline_reason = req.reason
    _notify(db, task.assigned_to, "Task Declined", f"'{task.title}' needs more work. Reason: {req.reason}", TASK_STATUS_CHANGED, task.id)
    db.commit()
    db.refresh(task)
    await _broadcast_task(task, task.team_id, TASK_STATUS_CHANGED)
    await manager.send_to_user(str(task.assigned_to), {"type": NOTIFICATION_NEW, "data": {"message": f"Task declined: {task.title}"}})
    return task


@router.put("/{task_id}/reassign", response_model=TaskResponse)
async def reassign_task(task_id: UUID, req: ReassignRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    lead = db.query(TeamMembership).filter(
        TeamMembership.team_id == task.team_id,
        TeamMembership.user_id == user.id,
        (TeamMembership.is_lead == True) | (user.role == "TL")
    ).first()
    if not lead and user.role not in ("CEO", "CTO", "PM"):
        raise HTTPException(403, "Only Team Leads can reassign tasks")

    # Find target assignee user
    target_user = db.query(User).filter(User.id == req.assigned_to).first()
    if not target_user:
        raise HTTPException(404, "Assignee user not found")

    # Rule: No one can assign tasks to CEO or CTO
    if target_user.role in ("CEO", "CTO"):
        raise HTTPException(400, "Tasks cannot be assigned to CEO or CTO.")

    # Rule: TM cannot assign tasks to PM
    if user.role == "TM" and target_user.role == "PM":
        raise HTTPException(400, "Team Members (TM) cannot assign tasks to Project Managers (PM).")

    if user.role == "TL":
        is_self = str(req.assigned_to) == str(user.id)
        is_member = db.query(TeamMembership).filter(
            TeamMembership.team_id == task.team_id,
            TeamMembership.user_id == req.assigned_to
        ).first()
        if not is_self and not is_member:
            raise HTTPException(400, "Team Leads can only reassign tasks to members of their team or to themselves.")

    old_assignee = task.assigned_to
    task.assigned_to = req.assigned_to
    task.status = "not_started"
    _log_status(db, task, "reassigned", "not_started", user.id, f"Task reassigned by {user.role} {user.first_name} {user.last_name}")
    _notify(db, req.assigned_to, "Task Reassigned to You", f"Task '{task.title}' has been reassigned to you.", TASK_REASSIGNED, task.id)
    db.commit()
    db.refresh(task)
    await _broadcast_task(task, task.team_id, TASK_REASSIGNED)
    await manager.send_to_user(str(req.assigned_to), {"type": NOTIFICATION_NEW, "data": {"message": f"Reassigned task: {task.title}"}})
    return task
