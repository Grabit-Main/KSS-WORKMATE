from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from uuid import UUID

from app.database import get_db
from app.models.project import Project, Team, TeamMembership, ProjectStatusLog
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


@router.get("/summary")
def get_history_summary(
    user_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    target_user_id = user_id if (user_id and user.role in ("CEO", "CTO")) else (user.id if user.role not in ("CEO", "CTO") else None)
    
    if not target_user_id:
        # CEO/CTO viewing global company summary
        p_query = db.query(Project)
        t_query = db.query(Task)
    else:
        target_u = db.query(User).filter(User.id == target_user_id).first()
        target_role = target_u.role if target_u else user.role

        if target_role == "PM":
            p_query = db.query(Project).filter(Project.created_by == target_user_id)
            team_ids = db.query(Team.id).join(Project).filter(Project.created_by == target_user_id).subquery()
            t_query = db.query(Task).filter((Task.team_id.in_(team_ids)) | (Task.assigned_to == target_user_id))
        elif target_role == "TL":
            my_teams = db.query(TeamMembership.team_id).filter(TeamMembership.user_id == target_user_id, TeamMembership.is_lead == True).subquery()
            p_ids = db.query(Team.project_id).filter(Team.id.in_(my_teams)).subquery()
            p_query = db.query(Project).filter(Project.id.in_(p_ids))
            t_query = db.query(Task).filter((Task.team_id.in_(my_teams)) | (Task.assigned_to == target_user_id))
        else: # TM
            my_teams = db.query(TeamMembership.team_id).filter(TeamMembership.user_id == target_user_id).subquery()
            p_ids = db.query(Team.project_id).filter(Team.id.in_(my_teams)).subquery()
            p_query = db.query(Project).filter(Project.id.in_(p_ids))
            t_query = db.query(Task).filter(Task.assigned_to == target_user_id)

    total_projects = p_query.count()
    completed_projects = p_query.filter(Project.status == "completed").count()
    active_projects = p_query.filter(Project.status.in_(["active", "in_progress"])).count()

    total_tasks = t_query.count()
    completed_tasks = t_query.filter(Task.status == "completed").count()
    in_progress_tasks = t_query.filter(Task.status == "in_progress").count()
    blocked_tasks = t_query.filter(Task.status == "blocked").count()

    return {
        "total_projects": total_projects,
        "completed_projects": completed_projects,
        "active_projects": active_projects,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "in_progress_tasks": in_progress_tasks,
        "blocked_tasks": blocked_tasks,
        "completion_rate": round((completed_tasks / max(total_tasks, 1)) * 100, 1)
    }


@router.get("/projects")
def get_projects_history(
    user_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    target_user_id = user_id if (user_id and user.role in ("CEO", "CTO")) else (user.id if user.role not in ("CEO", "CTO") else None)

    if not target_user_id:
        projects = db.query(Project).order_by(Project.created_at.desc()).all()
    else:
        target_u = db.query(User).filter(User.id == target_user_id).first()
        target_role = target_u.role if target_u else user.role
        if target_role == "PM":
            projects = db.query(Project).filter(Project.created_by == target_user_id).order_by(Project.created_at.desc()).all()
        else:
            my_teams = db.query(TeamMembership.team_id).filter(TeamMembership.user_id == target_user_id).subquery()
            p_ids = db.query(Team.project_id).filter(Team.id.in_(my_teams)).subquery()
            projects = db.query(Project).filter(Project.id.in_(p_ids)).order_by(Project.created_at.desc()).all()

    result = []
    for p in projects:
        teams = db.query(Team).filter(Team.project_id == p.id).all()
        team_summaries = []
        all_team_ids = [t.id for t in teams]

        for t in teams:
            memberships = db.query(TeamMembership).filter(TeamMembership.team_id == t.id).all()
            lead_member = next((m for m in memberships if m.is_lead), None)
            lead_user = lead_member.user if lead_member else None
            team_summaries.append({
                "id": str(t.id),
                "name": t.name,
                "member_count": len(memberships),
                "lead": _user_dict(lead_user)
            })

        if all_team_ids:
            tasks = db.query(Task).filter(Task.team_id.in_(all_team_ids)).all()
        else:
            tasks = []

        total_t = len(tasks)
        comp_t = sum(1 for t in tasks if t.status == "completed")
        prog_t = sum(1 for t in tasks if t.status == "in_progress")
        block_t = sum(1 for t in tasks if t.status == "blocked")

        logs = db.query(ProjectStatusLog).filter(ProjectStatusLog.project_id == p.id).order_by(ProjectStatusLog.created_at.desc()).all()
        log_list = [{
            "id": str(lg.id),
            "from_status": lg.from_status,
            "to_status": lg.to_status,
            "notes": lg.notes,
            "created_at": lg.created_at.isoformat() if lg.created_at else None,
            "changer": _user_dict(lg.changer)
        } for lg in logs]

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
    target_user_id = user_id if (user_id and user.role in ("CEO", "CTO")) else (user.id if user.role not in ("CEO", "CTO") else None)
    q = db.query(Task)

    if target_user_id:
        target_u = db.query(User).filter(User.id == target_user_id).first()
        target_role = target_u.role if target_u else user.role
        if target_role == "PM":
            team_ids = db.query(Team.id).join(Project).filter(Project.created_by == target_user_id).subquery()
            p_ids = db.query(Project.id).filter(Project.created_by == target_user_id).subquery()
            q = q.filter((Task.team_id.in_(team_ids)) | (Task.project_id.in_(p_ids)) | (Task.assigned_to == target_user_id))
        elif target_role == "TL":
            my_teams = db.query(TeamMembership.team_id).filter(TeamMembership.user_id == target_user_id, TeamMembership.is_lead == True).subquery()
            q = q.filter((Task.team_id.in_(my_teams)) | (Task.assigned_to == target_user_id))
        else: # TM
            q = q.filter(Task.assigned_to == target_user_id)

    if status and status != "all":
        q = q.filter(Task.status == status)

    if search:
        q = q.filter(Task.title.ilike(f"%{search}%"))

    tasks = q.order_by(Task.updated_at.desc(), Task.created_at.desc()).limit(100).all()

    result = []
    for t in tasks:
        team = db.query(Team).filter(Team.id == t.team_id).first() if t.team_id else None
        project = db.query(Project).filter(Project.id == t.project_id).first() if t.project_id else (
            db.query(Project).filter(Project.id == team.project_id).first() if (team and team.project_id) else None
        )

        logs = db.query(TaskStatusLog).filter(TaskStatusLog.task_id == t.id).order_by(TaskStatusLog.created_at.desc()).all()
        log_list = [{
            "id": str(lg.id),
            "from_status": lg.from_status,
            "to_status": lg.to_status,
            "reason": lg.reason,
            "created_at": lg.created_at.isoformat() if lg.created_at else None,
            "changer": _user_dict(lg.changer)
        } for lg in logs]

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
            "team_name": team.name if team else "General",
            "project_name": project.name if project else "General Project",
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
    target_user_id = user_id if (user_id and user.role in ("CEO", "CTO")) else (user.id if user.role not in ("CEO", "CTO") else None)

    t_log_q = db.query(TaskStatusLog)
    p_log_q = db.query(ProjectStatusLog)

    if target_user_id:
        target_u = db.query(User).filter(User.id == target_user_id).first()
        target_role = target_u.role if target_u else user.role

        if target_role == "TM":
            assigned_task_ids = db.query(Task.id).filter(Task.assigned_to == target_user_id).subquery()
            t_log_q = t_log_q.filter((TaskStatusLog.changed_by == target_user_id) | (TaskStatusLog.task_id.in_(assigned_task_ids)))
            user_teams = db.query(TeamMembership.team_id).filter(TeamMembership.user_id == target_user_id).subquery()
            proj_ids = db.query(Team.project_id).filter(Team.id.in_(user_teams)).subquery()
            p_log_q = p_log_q.filter((ProjectStatusLog.changed_by == target_user_id) | (ProjectStatusLog.project_id.in_(proj_ids)))

        elif target_role == "TL":
            my_teams = db.query(TeamMembership.team_id).filter(TeamMembership.user_id == target_user_id, TeamMembership.is_lead == True).subquery()
            tl_task_ids = db.query(Task.id).filter((Task.team_id.in_(my_teams)) | (Task.assigned_to == target_user_id)).subquery()
            t_log_q = t_log_q.filter((TaskStatusLog.changed_by == target_user_id) | (TaskStatusLog.task_id.in_(tl_task_ids)))
            p_ids = db.query(Team.project_id).filter(Team.id.in_(my_teams)).subquery()
            p_log_q = p_log_q.filter((ProjectStatusLog.changed_by == target_user_id) | (ProjectStatusLog.project_id.in_(p_ids)))

        elif target_role == "PM":
            pm_proj_ids = db.query(Project.id).filter(Project.created_by == target_user_id).subquery()
            pm_team_ids = db.query(Team.id).filter(Team.project_id.in_(pm_proj_ids)).subquery()
            pm_task_ids = db.query(Task.id).filter((Task.team_id.in_(pm_team_ids)) | (Task.project_id.in_(pm_proj_ids)) | (Task.assigned_to == target_user_id)).subquery()
            t_log_q = t_log_q.filter((TaskStatusLog.changed_by == target_user_id) | (TaskStatusLog.task_id.in_(pm_task_ids)))
            p_log_q = p_log_q.filter((ProjectStatusLog.changed_by == target_user_id) | (ProjectStatusLog.project_id.in_(pm_proj_ids)))

    t_logs = t_log_q.order_by(TaskStatusLog.created_at.desc()).limit(100).all()
    p_logs = p_log_q.order_by(ProjectStatusLog.created_at.desc()).limit(50).all()

    events = []

    for lg in t_logs:
        task = db.query(Task).filter(Task.id == lg.task_id).first()
        team = db.query(Team).filter(Team.id == task.team_id).first() if (task and task.team_id) else None
        project = db.query(Project).filter(Project.id == task.project_id).first() if (task and task.project_id) else (
            db.query(Project).filter(Project.id == team.project_id).first() if (team and team.project_id) else None
        )
        events.append({
            "id": f"task-log-{lg.id}",
            "type": "task",
            "title": task.title if task else "Task Update",
            "action": f"Task '{task.title if task else 'Task'}': {lg.from_status.replace('_', ' ')} → {lg.to_status.replace('_', ' ')}",
            "status": lg.to_status,
            "from_status": lg.from_status,
            "notes": lg.reason,
            "created_at": lg.created_at.isoformat() if lg.created_at else None,
            "timestamp": lg.created_at.timestamp() if lg.created_at else 0,
            "actor": _user_dict(lg.changer),
            "project_id": str(project.id) if project else None,
            "project_name": project.name if project else (f"Team: {team.name}" if team else "General Tasks"),
            "project_aim": project.aim if project else None,
            "project_deadline": project.deadline.isoformat() if (project and project.deadline) else None,
            "team_name": team.name if team else None,
            "task_id": str(task.id) if task else None,
            "task_title": task.title if task else None
        })

    for pl in p_logs:
        project = db.query(Project).filter(Project.id == pl.project_id).first()
        events.append({
            "id": f"project-log-{pl.id}",
            "type": "project",
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
            "task_title": None
        })

    events.sort(key=lambda x: x["timestamp"], reverse=True)
    return events[:150]
