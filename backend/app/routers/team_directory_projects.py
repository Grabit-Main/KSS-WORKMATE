from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.team_directory_project import TeamDirectoryProject
from app.schemas.team_directory_project import (
    TeamDirectoryProjectCreate,
    TeamDirectoryProjectUpdate,
    TeamDirectoryProjectResponse
)

router = APIRouter(tags=["Team Directory Projects"])

@router.get("", response_model=List[TeamDirectoryProjectResponse])
def list_team_directory_projects(
    developer_id: Optional[str] = Query(None),
    developer_email: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns all project assignments created by the TL for team directory.
    Accessible to everyone (Developers, TL, PM, CTO, CEO).
    """
    q = db.query(TeamDirectoryProject)
    if developer_id:
        q = q.filter(TeamDirectoryProject.developer_id == str(developer_id).strip())
    elif developer_email:
        q = q.filter(TeamDirectoryProject.developer_email == str(developer_email).strip().lower())
    return q.order_by(TeamDirectoryProject.created_at.desc()).all()

@router.post("", response_model=TeamDirectoryProjectResponse)
def create_team_directory_project(
    data: TeamDirectoryProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Only Team Leads (TL) can manually assign projects in Team Directory.
    """
    role = str(current_user.role or "").strip().upper()
    if role not in ("TL", "TEAM LEAD", "TEAMLEAD", "LEAD", "ADMIN"):
        raise HTTPException(status_code=403, detail="Only Team Leads (TL) can assign projects.")

    assigned_by_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or current_user.email
    proj = TeamDirectoryProject(
        developer_id=str(data.developer_id).strip(),
        developer_email=str(data.developer_email).strip().lower() if data.developer_email else None,
        developer_name=str(data.developer_name).strip() if data.developer_name else None,
        name=data.name.strip(),
        role=data.role.strip(),
        status=data.status or "Active",
        progress=max(0, min(100, data.progress or 0)),
        start_date=data.start_date,
        due_date=data.due_date,
        assigned_by=current_user.id,
        assigned_by_name=assigned_by_name
    )
    db.add(proj)
    db.commit()
    db.refresh(proj)
    return proj

@router.put("/{project_id}", response_model=TeamDirectoryProjectResponse)
def update_team_directory_project(
    project_id: UUID,
    data: TeamDirectoryProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Only Team Leads (TL) can update assigned projects.
    """
    role = str(current_user.role or "").strip().upper()
    if role not in ("TL", "TEAM LEAD", "TEAMLEAD", "LEAD", "ADMIN"):
        raise HTTPException(status_code=403, detail="Only Team Leads (TL) can update assigned projects.")

    proj = db.query(TeamDirectoryProject).filter(TeamDirectoryProject.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project assignment not found.")

    if data.name is not None:
        proj.name = data.name.strip()
    if data.role is not None:
        proj.role = data.role.strip()
    if data.status is not None:
        proj.status = data.status.strip()
    if data.progress is not None:
        proj.progress = max(0, min(100, data.progress))
    if data.start_date is not None:
        proj.start_date = data.start_date
    if data.due_date is not None:
        proj.due_date = data.due_date

    db.commit()
    db.refresh(proj)
    return proj

@router.delete("/{project_id}")
def delete_team_directory_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Only Team Leads (TL) can delete assigned projects.
    """
    role = str(current_user.role or "").strip().upper()
    if role not in ("TL", "TEAM LEAD", "TEAMLEAD", "LEAD", "ADMIN"):
        raise HTTPException(status_code=403, detail="Only Team Leads (TL) can delete assigned projects.")

    proj = db.query(TeamDirectoryProject).filter(TeamDirectoryProject.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project assignment not found.")

    db.delete(proj)
    db.commit()
    return {"status": "success", "message": "Project assignment deleted successfully."}
