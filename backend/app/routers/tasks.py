from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app.models.task import Task, TaskStatusLog
from app.models.project import TeamMembership
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
def list_tasks(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(Task)
    if user.role == "TM":
        q = q.filter(Task.assigned_to == user.id)
    elif user.role == "TL":
        # TL sees tasks in teams where they are lead or assigned to them
        team_ids = db.query(TeamMembership.team_id).filter(TeamMembership.user_id == user.id, TeamMembership.is_lead == True).subquery()
        q = q.filter((Task.team_id.in_(team_ids)) | (Task.assigned_to == user.id))
    elif user.role == "PM":
        from app.models.project import Team, Project
        team_ids = db.query(Team.id).join(Project).filter(Project.created_by == user.id).subquery()
        q = q.filter((Task.team_id.in_(team_ids)) | (Task.assigned_to == user.id))
    # CEO/CTO see all
    return q.order_by(Task.created_at.desc()).all()


@router.post("", response_model=TaskResponse)
async def create_task(req: TaskCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    # Must be TL of that team
    lead = db.query(TeamMembership).filter(TeamMembership.team_id == req.team_id, TeamMembership.user_id == user.id, TeamMembership.is_lead == True).first()
    if not lead and user.role not in ("CEO", "CTO", "PM"):
        raise HTTPException(403, "Only Team Leads can create tasks")
    task = Task(**req.model_dump(), assigned_by=user.id)
    db.add(task)
    db.flush()
    if str(req.assigned_to) == str(user.id):
        log_msg = f"Task self-assigned by {user.role} {user.first_name} {user.last_name}"
    else:
        log_msg = f"Task assigned by {user.role} {user.first_name} {user.last_name}"
    _log_status(db, task, "created", "not_started", user.id, log_msg)
    _notify(db, req.assigned_to, "New Task Assigned", f"You have a new task: {req.title}", TASK_CREATED, None)
    db.commit()
    db.refresh(task)
    await _broadcast_task(task, req.team_id, TASK_CREATED)
    await manager.send_to_user(str(req.assigned_to), {"type": NOTIFICATION_NEW, "data": {"message": f"New task: {req.title}"}})
    return task


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    return task


@router.put("/{task_id}/accept", response_model=TaskResponse)
async def accept_task(task_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id, Task.assigned_to == user.id).first()
    if not task:
        raise HTTPException(404, "Task not found or not assigned to you")
    if task.status != "not_started":
        raise HTTPException(400, "Task cannot be accepted in current state")
    _log_status(db, task, task.status, "in_progress", user.id)
    task.status = "in_progress"
    db.commit()
    db.refresh(task)
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
    # Must be TL of team
    lead = db.query(TeamMembership).filter(TeamMembership.team_id == task.team_id, TeamMembership.user_id == user.id, TeamMembership.is_lead == True).first()
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
    lead = db.query(TeamMembership).filter(TeamMembership.team_id == task.team_id, TeamMembership.user_id == user.id, TeamMembership.is_lead == True).first()
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
    lead = db.query(TeamMembership).filter(TeamMembership.team_id == task.team_id, TeamMembership.user_id == user.id, TeamMembership.is_lead == True).first()
    if not lead and user.role not in ("CEO", "CTO", "PM"):
        raise HTTPException(403, "Only Team Leads can reassign tasks")
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
