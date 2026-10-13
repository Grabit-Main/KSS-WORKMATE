from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, case, or_
from sqlalchemy.orm import Session, joinedload, selectinload
from typing import List, Optional
from datetime import datetime
from uuid import UUID

from app.database import get_db
from app.models.project import Project, Team, TeamMembership, ProjectStatusLog, project_teams
from app.models.task import Task, TaskStatusLog
from app.models.user import User
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/history", tags=["history"])


def _user_dict(u: Optional[User]):
    if not u:
        return None
    return {
        "id": str(u.id),
        "first_name": u.first_name,
        "last_name": u.last_name,
        "email": u.email,
        "role": u.role,
        "department": getattr(u, "department", None)
    }


def _get_project_query(db: Session, user: User, target_user_id: Optional[UUID] = None):
    """
    Returns query for projects matching the user's role and target_user_id.
    - CEO, CTO, CO: Company-wide projects (or target user's projects if specified)
    - PM: Managed/company projects (or target user's projects if specified)
    - TL: Projects linked to TL's squads/teams (via project_teams or Team.project_id)
    - TM: Projects linked to TM's squads/teams (via project_teams or Team.project_id)
    """
    q = db.query(Project)
    effective_target_id = target_user_id if (target_user_id and user.role in ("CEO", "CTO", "CO")) else (target_user_id if target_user_id else (user.id if user.role not in ("CEO", "CTO", "CO") else None))

    if not effective_target_id:
        return q

    target_u = db.query(User).filter(User.id == effective_target_id).first()
    target_role = target_u.role if target_u else user.role

    if target_role in ("CEO", "CTO", "CO"):
        return q
    elif target_role == "PM":
        return q.filter(Project.created_by == effective_target_id)
    else:
        user_team_ids = db.query(TeamMembership.team_id).filter(TeamMembership.user_id == effective_target_id)
        pt_project_ids = db.query(project_teams.c.project_id).filter(project_teams.c.team_id.in_(user_team_ids))
        legacy_project_ids = db.query(Team.project_id).filter(Team.id.in_(user_team_ids), Team.project_id.isnot(None))
        all_p_ids = pt_project_ids.union(legacy_project_ids)
        return q.filter(Project.id.in_(all_p_ids))


def _get_task_query(db: Session, user: User, target_user_id: Optional[UUID] = None):
    """
    Returns query for tasks matching the user's role and target_user_id.
    - CEO, CTO, CO: Company-wide tasks (or target user's tasks if specified)
    - PM: Company-wide tasks (or target user's tasks if specified)
    - TL: Tasks for all members of TL's squads/teams, plus tasks assigned to/by TL
    - TM: Tasks assigned to or by the TM
    """
    effective_target_id = target_user_id if (target_user_id and user.role in ("CEO", "CTO", "CO")) else (target_user_id if target_user_id else (user.id if user.role not in ("CEO", "CTO", "CO") else None))

    if not effective_target_id:
        return db.query(Task)

    target_u = db.query(User).filter(User.id == effective_target_id).first()
    target_role = target_u.role if target_u else user.role

    if target_role in ("CEO", "CTO", "CO", "PM"):
        return db.query(Task)
    elif target_role == "TL":
        my_team_ids = [tm[0] for tm in db.query(TeamMembership.team_id).filter(TeamMembership.user_id == effective_target_id).all()]
        if my_team_ids:
            team_member_ids = [tm[0] for tm in db.query(TeamMembership.user_id).filter(TeamMembership.team_id.in_(my_team_ids)).all()]
            return db.query(Task).filter(
                (Task.assigned_to.in_(team_member_ids)) |
                (Task.assigned_by.in_(team_member_ids)) |
                (Task.team_id.in_(my_team_ids)) |
                (Task.assigned_to == effective_target_id) |
                (Task.assigned_by == effective_target_id)
            )
        else:
            return db.query(Task).filter(
                (Task.assigned_to == effective_target_id) | (Task.assigned_by == effective_target_id)
            )
    else:
        return db.query(Task).filter(
            (Task.assigned_to == effective_target_id) | (Task.assigned_by == effective_target_id)
        )


@router.get("/summary")
def get_history_summary(
    user_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    proj_q = _get_project_query(db, user, user_id)
    p_row = proj_q.with_entities(
        func.count(Project.id),
        func.sum(case((Project.status == "completed", 1), else_=0)),
        func.sum(case((Project.status.in_(["active", "in_progress"]), 1), else_=0))
    ).first()

    total_projects = (p_row[0] or 0) if p_row else 0
    completed_projects = (p_row[1] or 0) if p_row else 0
    active_projects = (p_row[2] or 0) if p_row else 0

    task_q = _get_task_query(db, user, user_id)
    t_row = task_q.with_entities(
        func.count(Task.id),
        func.sum(case((Task.status == "completed", 1), else_=0)),
        func.sum(case((Task.status.in_(["in_progress", "active"]), 1), else_=0)),
        func.sum(case((Task.status == "blocked", 1), else_=0))
    ).first()

    total_tasks = (t_row[0] or 0) if t_row else 0
    completed_tasks = (t_row[1] or 0) if t_row else 0
    in_progress_tasks = (t_row[2] or 0) if t_row else 0
    blocked_tasks = (t_row[3] or 0) if t_row else 0

    completion_rate = round((completed_tasks / total_tasks) * 100, 1) if total_tasks > 0 else 0.0

    return {
        "total_projects": total_projects,
        "completed_projects": completed_projects,
        "active_projects": active_projects,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "in_progress_tasks": in_progress_tasks,
        "blocked_tasks": blocked_tasks,
        "completion_rate": completion_rate
    }


@router.get("/projects")
def get_projects_history(
    user_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    proj_q = _get_project_query(db, user, user_id)

    q = proj_q.options(
        joinedload(Project.creator),
        selectinload(Project.status_logs).joinedload(ProjectStatusLog.changer),
        selectinload(Project.teams).selectinload(Team.memberships).joinedload(TeamMembership.user)
    )

    projects = q.order_by(Project.created_at.desc()).all()

    if not projects:
        return []

    project_ids = [p.id for p in projects]
    all_team_ids = []
    team_to_proj = {}

    for p in projects:
        for t in p.teams:
            all_team_ids.append(t.id)
            team_to_proj[t.id] = p.id

    if all_team_ids:
        tasks = db.query(Task.id, Task.project_id, Task.team_id, Task.status).filter(
            or_(Task.project_id.in_(project_ids), Task.team_id.in_(all_team_ids))
        ).all()
    else:
        tasks = db.query(Task.id, Task.project_id, Task.team_id, Task.status).filter(
            Task.project_id.in_(project_ids)
        ).all()

    proj_task_stats = {pid: {"total": 0, "completed": 0, "in_progress": 0, "blocked": 0} for pid in project_ids}

    for tid, pid, team_id, status in tasks:
        target_pid = pid if pid in proj_task_stats else team_to_proj.get(team_id)
        if target_pid and target_pid in proj_task_stats:
            proj_task_stats[target_pid]["total"] += 1
            if status == "completed":
                proj_task_stats[target_pid]["completed"] += 1
            elif status == "in_progress":
                proj_task_stats[target_pid]["in_progress"] += 1
            elif status == "blocked":
                proj_task_stats[target_pid]["blocked"] += 1

    result = []
    for p in projects:
        team_summaries = []
        for t in p.teams:
            memberships = t.memberships
            lead_member = next((m for m in memberships if m.is_lead), None)
            lead_user = lead_member.user if lead_member else None
            team_summaries.append({
                "id": str(t.id),
                "name": t.name,
                "member_count": len(memberships),
                "lead": _user_dict(lead_user)
            })

        stats = proj_task_stats.get(p.id, {"total": 0, "completed": 0, "in_progress": 0, "blocked": 0})
        total_t = stats["total"]
        comp_t = stats["completed"]
        prog_t = stats["in_progress"]
        block_t = stats["blocked"]

        log_list = [{
            "id": str(lg.id),
            "from_status": lg.from_status,
            "to_status": lg.to_status,
            "notes": lg.notes,
            "created_at": lg.created_at.isoformat() if lg.created_at else None,
            "changer": _user_dict(lg.changer)
        } for lg in p.status_logs]

        result.append({
            "id": str(p.id),
            "name": p.name,
            "aim": p.aim,
            "status": p.status,
            "deadline": p.deadline.isoformat() if p.deadline else None,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "creator": _user_dict(p.creator),
            "teams": team_summaries,
            "total_tasks": total_t,
            "completed_tasks": comp_t,
            "in_progress_tasks": prog_t,
            "blocked_tasks": block_t,
            "completion_rate": round((comp_t / max(total_t, 1)) * 100, 1) if total_t > 0 else 0,
            "status_logs": log_list
        })

    return result


@router.get("/tasks")
def get_tasks_history(
    status: Optional[str] = None,
    search: Optional[str] = None,
    user_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    q = _get_task_query(db, user, user_id)

    if status and status != "all":
        q = q.filter(Task.status == status)

    if search:
        q = q.filter(Task.title.ilike(f"%{search}%"))

    tasks = q.options(
        joinedload(Task.team),
        joinedload(Task.project),
        joinedload(Task.assignee),
        joinedload(Task.assigner),
        selectinload(Task.status_logs).joinedload(TaskStatusLog.changer)
    ).order_by(Task.updated_at.desc(), Task.created_at.desc()).limit(100).all()

    result = []
    for t in tasks:
        log_list = [{
            "id": str(lg.id),
            "from_status": lg.from_status,
            "to_status": lg.to_status,
            "reason": lg.reason,
            "created_at": lg.created_at.isoformat() if lg.created_at else None,
            "changer": _user_dict(lg.changer)
        } for lg in t.status_logs]

        result.append({
            "id": str(t.id),
            "title": t.title,
            "description": t.description,
            "status": t.status,
            "priority": t.priority,
            "deadline": t.deadline.isoformat() if t.deadline else None,
            "scheduled_date": t.scheduled_date,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "updated_at": t.updated_at.isoformat() if t.updated_at else None,
            "is_locked": t.is_locked,
            "team_name": t.team.name if t.team else "General",
            "project_name": t.project.name if t.project else "Standalone Task",
            "assignee": _user_dict(t.assignee),
            "assigner": _user_dict(t.assigner),
            "status_logs": log_list
        })

    return result


@router.get("/activity")
def get_activity_history(
    user_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    task_q = _get_task_query(db, user, user_id)
    proj_q = _get_project_query(db, user, user_id)

    t_logs = db.query(TaskStatusLog).filter(
        TaskStatusLog.task_id.in_(task_q.with_entities(Task.id))
    ).options(
        joinedload(TaskStatusLog.changer),
        joinedload(TaskStatusLog.task).joinedload(Task.team),
        joinedload(TaskStatusLog.task).joinedload(Task.project),
        joinedload(TaskStatusLog.task).joinedload(Task.assignee)
    ).order_by(TaskStatusLog.created_at.desc()).limit(100).all()

    p_logs = db.query(ProjectStatusLog).filter(
        ProjectStatusLog.project_id.in_(proj_q.with_entities(Project.id))
    ).options(
        joinedload(ProjectStatusLog.changer),
        joinedload(ProjectStatusLog.project)
    ).order_by(ProjectStatusLog.created_at.desc()).limit(50).all()

    events = []

    for lg in t_logs:
        task = lg.task
        team = task.team if task else None
        project = task.project if task else None
        is_project_task = bool(task and task.project_id is not None)
        events.append({
            "id": f"task-log-{lg.id}",
            "type": "task",
            "category": "project_task" if is_project_task else "normal_task",
            "is_project_task": is_project_task,
            "title": task.title if task else "Task Update",
            "action": f"Task '{task.title if task else 'Task'}': {lg.from_status.replace('_', ' ')} → {lg.to_status.replace('_', ' ')}",
            "status": lg.to_status,
            "from_status": lg.from_status,
            "notes": lg.reason,
            "created_at": lg.created_at.isoformat() if lg.created_at else None,
            "timestamp": lg.created_at.timestamp() if lg.created_at else 0,
            "actor": _user_dict(lg.changer),
            "project_id": str(project.id) if project else None,
            "project_name": project.name if project else None,
            "project_aim": project.aim if project else None,
            "project_deadline": project.deadline.isoformat() if (project and project.deadline) else None,
            "team_name": team.name if team else None,
            "task_id": str(task.id) if task else None,
            "task_title": task.title if task else None,
            "task_deadline": task.deadline.isoformat() if (task and task.deadline) else None,
            "task_priority": task.priority if task else None,
            "assignee": _user_dict(task.assignee) if (task and task.assignee) else None,
        })

    for pl in p_logs:
        project = pl.project
        events.append({
            "id": f"project-log-{pl.id}",
            "type": "project",
            "category": "project_task",
            "is_project_task": True,
            "title": project.name if project else "Project",
            "action": f"Project status: {pl.to_status.replace('_', ' ')}",
            "status": pl.to_status,
            "from_status": pl.from_status,
            "notes": pl.notes,
            "created_at": pl.created_at.isoformat() if pl.created_at else None,
            "timestamp": pl.created_at.timestamp() if pl.created_at else 0,
            "actor": _user_dict(pl.changer),
            "project_id": str(project.id) if project else None,
            "project_name": project.name if project else "Project",
            "project_aim": project.aim if project else None,
            "project_deadline": project.deadline.isoformat() if (project and project.deadline) else None,
            "team_name": None,
            "task_id": None,
            "task_title": None,
            "task_deadline": None,
            "task_priority": None,
            "assignee": None,
        })

    events.sort(key=lambda x: x["timestamp"], reverse=True)
    return events[:150]

