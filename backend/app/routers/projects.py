from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app.models.project import Project, ProjectStatusLog
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.dependencies import get_current_user
from app.websocket.manager import manager
from app.websocket.events import PROJECT_CREATED, PROJECT_UPDATED, PROJECT_DELETED

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=List[ProjectResponse])
def list_projects(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(Project)
    # TM/TL only see projects they're part of via team membership
    if user.role in ("TM", "TL"):
        from app.models.project import Team, TeamMembership
        project_ids = (
            db.query(Team.project_id)
            .join(TeamMembership, TeamMembership.team_id == Team.id)
            .filter(TeamMembership.user_id == user.id)
            .subquery()
        )
        q = q.filter(Project.id.in_(project_ids))
    elif user.role == "PM":
        q = q.filter(Project.created_by == user.id)
    # CEO and CTO have company-wide visibility to oversee projects
    return q.order_by(Project.created_at.desc()).all()


@router.post("", response_model=ProjectResponse)
async def create_project(req: ProjectCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    # Restrict project creation to PM only (CEO and CTO do not assign projects)
    if user.role != "PM":
        raise HTTPException(403, "Only Project Managers (PM) can create and assign projects. CEO and CTO oversee and assign tasks.")
    from app.models.project import Team
    project_data = req.model_dump(exclude={"team_id", "team_ids"})
    project = Project(**project_data, created_by=user.id)
    db.add(project)
    db.flush()

    # Allocate to teams if specified
    allocated_ids = list(req.team_ids or [])
    if req.team_id and req.team_id not in allocated_ids:
        allocated_ids.append(req.team_id)

    allocated_team_names = []
    for tid in allocated_ids:
        team = db.query(Team).filter(Team.id == tid).first()
        if team:
            team.project_id = project.id
            allocated_team_names.append(team.name)

    notes = f"Project created and allocated to {', '.join(allocated_team_names)}" if allocated_team_names else "Project created and assigned by PM"
    log = ProjectStatusLog(
        project_id=project.id,
        from_status="created",
        to_status=project.status or "active",
        changed_by=user.id,
        notes=notes
    )
    db.add(log)
    db.commit()
    db.refresh(project)
    event = {"type": PROJECT_CREATED, "data": {"id": str(project.id), "name": project.name}}
    await manager.broadcast("global:admins", event)
    await manager.broadcast("global:all", event)
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: UUID, req: ProjectUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    from app.models.project import Team
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")
    if user.role not in ("PM", "CEO", "CTO"):
        raise HTTPException(403, "Insufficient permissions to update project")
    old_status = project.status
    update_data = req.model_dump(exclude_none=True, exclude={"team_id", "team_ids"})
    for field, val in update_data.items():
        setattr(project, field, val)

    if req.status and req.status != old_status:
        log = ProjectStatusLog(
            project_id=project.id,
            from_status=old_status,
            to_status=req.status,
            changed_by=user.id,
            notes=f"Project status updated to {req.status}"
        )
        db.add(log)

    # Handle multiple/single team allocation
    if req.team_ids is not None or req.team_id is not None:
        new_team_ids = list(req.team_ids or [])
        if req.team_id and req.team_id not in new_team_ids:
            new_team_ids.append(req.team_id)

        # Unassign teams that are no longer assigned to this project
        current_teams = db.query(Team).filter(Team.project_id == project.id).all()
        for t in current_teams:
            if t.id not in new_team_ids:
                t.project_id = None

        # Assign selected teams to this project
        allocated_team_names = []
        for tid in new_team_ids:
            team = db.query(Team).filter(Team.id == tid).first()
            if team:
                team.project_id = project.id
                allocated_team_names.append(team.name)

        if allocated_team_names:
            team_log = ProjectStatusLog(
                project_id=project.id,
                from_status=project.status,
                to_status=project.status,
                changed_by=user.id,
                notes=f"Project teams updated to: {', '.join(allocated_team_names)}"
            )
            db.add(team_log)

    db.commit()
    db.refresh(project)
    event = {"type": PROJECT_UPDATED, "data": {"id": str(project.id), "name": project.name, "status": project.status}}
    await manager.broadcast(f"project:{project_id}", event)
    await manager.broadcast("global:admins", event)
    await manager.broadcast("global:all", event)
    return project


@router.delete("/{project_id}")
async def delete_project(project_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")
    if user.role not in ("PM", "CEO", "CTO"):
        raise HTTPException(403, "Only Project Managers, CEO, and CTO can delete projects")

    from app.models.project import Team
    from app.models.task import Task

    # Unlink teams from this project
    db.query(Team).filter(Team.project_id == project.id).update({"project_id": None})

    # Unlink tasks from this project
    db.query(Task).filter(Task.project_id == project.id).update({"project_id": None})

    db.delete(project)
    db.commit()

    event = {"type": PROJECT_DELETED, "data": {"id": str(project_id)}}
    await manager.broadcast(f"project:{project_id}", event)
    await manager.broadcast("global:admins", event)
    await manager.broadcast("global:all", event)
    return {"message": "Project deleted successfully"}

