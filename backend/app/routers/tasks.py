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
            "task_id": str(task.id),
            "title": task.title,
            "status": task.status,
            "project_id": str(task.project_id) if task.project_id else None,
            "team_id": str(team_id) if team_id else (str(task.team_id) if task.team_id else None),
            "assigned_to": str(task.assigned_to) if task.assigned_to else None,
            "assigned_by": str(task.assigned_by) if task.assigned_by else None,
            "is_locked": task.is_locked,
            "scheduled_date": task.scheduled_date,
            "deadline": task.deadline.isoformat() if task.deadline else None,
            "deadline_exceeded": getattr(task, "deadline_exceeded", False),
            "assignee": {
                "id": str(task.assignee.id),
                "first_name": task.assignee.first_name,
                "last_name": task.assignee.last_name,
                "email": task.assignee.email,
                "role": task.assignee.role,
                "avatar_url": getattr(task.assignee, "avatar_url", None)
            } if getattr(task, "assignee", None) else None,
            "assigner": {
                "id": str(task.assigner.id),
                "first_name": task.assigner.first_name,
                "last_name": task.assigner.last_name,
                "email": task.assigner.email,
                "role": task.assigner.role,
                "avatar_url": getattr(task.assigner, "avatar_url", None)
            } if getattr(task, "assigner", None) else None,
        }
    }
    if team_id:
        await manager.broadcast(f"team:{team_id}", data)
    elif task.team_id:
        await manager.broadcast(f"team:{task.team_id}", data)
    if task.project_id:
        await manager.broadcast(f"project:{task.project_id}", data)
    await manager.broadcast(f"task:{task.id}", data)
    if task.assigned_to:
        await manager.send_to_user(str(task.assigned_to), data)
    if task.assigned_by and str(task.assigned_by) != str(task.assigned_to):
        await manager.send_to_user(str(task.assigned_by), data)
    await manager.broadcast("global:admins", {"type": ANALYTICS_REFRESH, "data": {}})
    await manager.broadcast("global:all", {"type": ANALYTICS_REFRESH, "data": {}})


@router.get("", response_model=List[TaskResponse])
def list_tasks(
    project_id: Optional[UUID] = None,
    scheduled_date: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # Visibility rule: strictly only show for the user who assigned the task and the user assigned to do it
    q = db.query(Task).filter((Task.assigned_to == user.id) | (Task.assigned_by == user.id))

    if project_id:
        # Match strictly tasks assigned directly to this project.
        # Standalone tasks assigned separately must NOT be included in projects.
        q = q.filter(Task.project_id == project_id)

    if scheduled_date:
        import re
        clean_sched = scheduled_date.strip()
        m_iso = re.match(r"^(\d{4})[-/](\d{2})[-/](\d{2})", clean_sched)
        m_dd = re.match(r"^(\d{2})[-/](\d{2})[-/](\d{4})", clean_sched)
        if m_iso:
            d1 = f"{m_iso.group(3)}-{m_iso.group(2)}-{m_iso.group(1)}"
            d2 = f"{m_iso.group(1)}-{m_iso.group(2)}-{m_iso.group(3)}"
            q = q.filter((Task.scheduled_date == d1) | (Task.scheduled_date == d2))
        elif m_dd:
            d1 = f"{m_dd.group(1)}-{m_dd.group(2)}-{m_dd.group(3)}"
            d2 = f"{m_dd.group(3)}-{m_dd.group(2)}-{m_dd.group(1)}"
            q = q.filter((Task.scheduled_date == d1) | (Task.scheduled_date == d2))
        else:
            q = q.filter(Task.scheduled_date == scheduled_date)

    tasks = q.order_by(Task.created_at.desc()).all()
    if user.role == "TM":
        from datetime import datetime
        import re
        today = datetime.now().date()
        filtered = []
        for t in tasks:
            if t.scheduled_date:
                clean_s = t.scheduled_date.strip()
                m_iso = re.match(r"^(\d{4})[-/](\d{2})[-/](\d{2})", clean_s)
                m_dd = re.match(r"^(\d{2})[-/](\d{2})[-/](\d{4})", clean_s)
                try:
                    if m_iso:
                        t_date = datetime.strptime(f"{m_iso.group(1)}-{m_iso.group(2)}-{m_iso.group(3)}", "%Y-%m-%d").date()
                    elif m_dd:
                        t_date = datetime.strptime(f"{m_dd.group(3)}-{m_dd.group(2)}-{m_dd.group(1)}", "%Y-%m-%d").date()
                    else:
                        t_date = datetime.strptime(clean_s, "%Y-%m-%d").date()
                    if t_date > today:
                        continue
                except Exception:
                    pass
            filtered.append(t)
        return filtered
    return tasks


@router.post("", response_model=TaskResponse)
async def create_task(req: TaskCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    # Auto-resolve team_id if missing and project_id is specified
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

    # Check authorization: Must be TL of that team, or CEO/CTO/PM
    if req.team_id:
        lead = db.query(TeamMembership).filter(
            TeamMembership.team_id == req.team_id,
            TeamMembership.user_id == user.id,
            (TeamMembership.is_lead == True) | (user.role == "TL")
        ).first()
        if not lead and user.role not in ("CEO", "CTO", "PM"):
            raise HTTPException(403, "Only Team Leads or PMs can allocate tasks")

    # Day-wise task allocation rule: Team Leads, Project Managers, and Executives can allocate day-wise tasks
    if req.scheduled_date:
        if user.role not in ("PM", "TL", "CEO", "CTO"):
            is_squad_lead = bool(req.team_id and db.query(TeamMembership).filter(
                TeamMembership.team_id == req.team_id,
                TeamMembership.user_id == user.id,
                TeamMembership.is_lead == True
            ).first())
            if not is_squad_lead:
                raise HTTPException(403, "Only Team Leads, Project Managers, or Executives can allocate day-wise tasks.")

        # Standardize scheduled_date into DD-MM-YYYY format
        import re
        clean_sched = req.scheduled_date.strip()
        m_iso = re.match(r"^(\d{4})[-/](\d{2})[-/](\d{2})", clean_sched)
        if m_iso:
            req.scheduled_date = f"{m_iso.group(3)}-{m_iso.group(2)}-{m_iso.group(1)}"
        else:
            m_dd = re.match(r"^(\d{2})[-/](\d{2})[-/](\d{4})", clean_sched)
            if m_dd:
                req.scheduled_date = f"{m_dd.group(1)}-{m_dd.group(2)}-{m_dd.group(3)}"

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
    await _broadcast_task(task, task.team_id or req.team_id, TASK_CREATED)
    await manager.send_to_user(str(req.assigned_to), {
        "type": NOTIFICATION_NEW,
        "data": {
            "title": "New Task Assigned",
            "message": f"You have been allocated a new task: {req.title}",
            "ref_id": str(task.id),
            "task_id": str(task.id),
            "event_type": TASK_CREATED
        }
    })
    return task


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    if str(task.assigned_to) != str(user.id) and str(task.assigned_by) != str(user.id):
        raise HTTPException(403, "Not authorized to view this task. Only the assigner and assignee can access.")
    if user.role == "TM" and task.scheduled_date:
        from datetime import datetime
        import re
        today = datetime.now().date()
        clean_s = task.scheduled_date.strip()
        m_iso = re.match(r"^(\d{4})[-/](\d{2})[-/](\d{2})", clean_s)
        m_dd = re.match(r"^(\d{2})[-/](\d{2})[-/](\d{4})", clean_s)
        try:
            if m_iso:
                t_date = datetime.strptime(f"{m_iso.group(1)}-{m_iso.group(2)}-{m_iso.group(3)}", "%Y-%m-%d").date()
            elif m_dd:
                t_date = datetime.strptime(f"{m_dd.group(3)}-{m_dd.group(2)}-{m_dd.group(1)}", "%Y-%m-%d").date()
            else:
                t_date = datetime.strptime(clean_s, "%Y-%m-%d").date()
            if t_date > today:
                raise HTTPException(403, "Members can only access current date tasks; upcoming days tasks are locked.")
        except HTTPException:
            raise
        except Exception:
            pass
    return task


@router.post("/{task_id}/start", response_model=TaskResponse)
@router.put("/{task_id}/start", response_model=TaskResponse)
@router.put("/{task_id}/accept", response_model=TaskResponse)
async def start_task(task_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    is_assignee = str(task.assigned_to) == str(user.id)
    if not is_assignee:
        raise HTTPException(403, "Only the assigned user can start this task")
    if user.role == "TM" and task.scheduled_date:
        from datetime import datetime
        import re
        today = datetime.now().date()
        clean_s = task.scheduled_date.strip()
        m_iso = re.match(r"^(\d{4})[-/](\d{2})[-/](\d{2})", clean_s)
        m_dd = re.match(r"^(\d{2})[-/](\d{2})[-/](\d{4})", clean_s)
        try:
            if m_iso:
                t_date = datetime.strptime(f"{m_iso.group(1)}-{m_iso.group(2)}-{m_iso.group(3)}", "%Y-%m-%d").date()
            elif m_dd:
                t_date = datetime.strptime(f"{m_dd.group(3)}-{m_dd.group(2)}-{m_dd.group(1)}", "%Y-%m-%d").date()
            else:
                t_date = datetime.strptime(clean_s, "%Y-%m-%d").date()
            if t_date > today:
                raise HTTPException(403, "Members cannot start an upcoming task before its scheduled date.")
        except HTTPException:
            raise
        except Exception:
            pass
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
    if not task:
        raise HTTPException(404, "Task not found")
    if task.status == "completed":
        raise HTTPException(400, "Task is already completed")
    # Must strictly be assigner of task
    is_assigner = str(task.assigned_by) == str(user.id)
    if not is_assigner:
        raise HTTPException(403, "Only the task assigner can confirm and complete tasks")
    _log_status(db, task, task.status, "completed", user.id)
    task.status = "completed"
    task.is_locked = True
    _notify(db, task.assigned_to, "Task Completed!", f"'{task.title}' has been confirmed complete.", TASK_LOCKED, task.id)
    db.commit()
    db.refresh(task)
    await _broadcast_task(task, task.team_id, TASK_LOCKED)
    await _broadcast_task(task, task.team_id, TASK_STATUS_CHANGED)
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
    is_task_assigner = str(task.assigned_by) == str(user.id)
    if not is_task_assigner:
        raise HTTPException(403, "Only the task assigner can reassign tasks")

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
        # Check all teams where user is TL
        led_teams = db.query(TeamMembership.team_id).filter(
            TeamMembership.user_id == user.id,
            (TeamMembership.is_lead == True) | (user.role == "TL")
        ).all()
        led_team_ids = [m.team_id for m in led_teams]
        if task.team_id and task.team_id not in led_team_ids:
            led_team_ids.append(task.team_id)

        is_member = db.query(TeamMembership).filter(
            TeamMembership.team_id.in_(led_team_ids),
            TeamMembership.user_id == req.assigned_to
        ).first() is not None

        if not is_self and not is_member:
            raise HTTPException(400, "Team Leads can only reassign tasks to members of their squads or to themselves.")

    old_assignee = task.assigned_to
    task.assigned_to = req.assigned_to
    task.status = "not_started"
    reason_suffix = f" (Note: {req.reason.strip()})" if req.reason and req.reason.strip() else ""
    _log_status(db, task, "reassigned", "not_started", user.id, f"Task reassigned by {user.role} {user.first_name} {user.last_name}{reason_suffix}")
    _notify(db, req.assigned_to, "Task Reassigned to You", f"Task '{task.title}' has been reassigned to you.{reason_suffix}", TASK_REASSIGNED, task.id)
    db.commit()
    db.refresh(task)
    await _broadcast_task(task, task.team_id, TASK_REASSIGNED)
    await _broadcast_task(task, task.team_id, TASK_STATUS_CHANGED)
    await manager.send_to_user(str(req.assigned_to), {"type": NOTIFICATION_NEW, "data": {"message": f"Reassigned task: {task.title}"}})
    return task
