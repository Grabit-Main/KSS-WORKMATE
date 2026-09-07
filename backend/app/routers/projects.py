from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app.models.project import Project
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.dependencies import get_current_user, require_pm_up
from app.websocket.manager import manager
from app.websocket.events import PROJECT_CREATED, PROJECT_UPDATED

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
    return q.all()


@router.post("", response_model=ProjectResponse)
async def create_project(req: ProjectCreate, db: Session = Depends(get_db), user: User = Depends(require_pm_up)):
    project = Project(**req.model_dump(), created_by=user.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    event = {"type": PROJECT_CREATED, "data": {"id": str(project.id), "name": project.name}}
    await manager.broadcast("global:admins", event)
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: UUID, req: ProjectUpdate, db: Session = Depends(get_db), user: User = Depends(require_pm_up)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")
    for field, val in req.model_dump(exclude_none=True).items():
        setattr(project, field, val)
    db.commit()
    db.refresh(project)
    event = {"type": PROJECT_UPDATED, "data": {"id": str(project.id), "name": project.name, "status": project.status}}
    await manager.broadcast(f"project:{project_id}", event)
    await manager.broadcast("global:admins", event)
    return project
