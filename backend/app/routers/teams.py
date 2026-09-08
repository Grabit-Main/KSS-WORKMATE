from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app.models.project import Team, TeamMembership, Project
from app.models.user import User
from app.schemas.project import TeamCreate, TeamResponse, AddMemberRequest, SetLeadRequest
from app.dependencies import get_current_user, require_pm_up
from app.websocket.manager import manager
from app.websocket.events import TEAM_CREATED, TEAM_MEMBER_ADDED, TEAM_MEMBER_REMOVED, TEAM_LEAD_ASSIGNED

router = APIRouter(prefix="/api/teams", tags=["teams"])


@router.post("", response_model=TeamResponse)
async def create_team(req: TeamCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role != "PM":
        raise HTTPException(403, "Only Project Managers (PM) can create teams and assign projects")
    team = Team(project_id=req.project_id, name=req.name, created_by=user.id)
    db.add(team)
    db.commit()
    db.refresh(team)
    event = {"type": TEAM_CREATED, "data": {"id": str(team.id), "name": team.name, "project_id": str(req.project_id)}}
    await manager.broadcast("global:admins", event)
    await manager.broadcast(f"project:{req.project_id}", event)
    return team


@router.get("", response_model=List[TeamResponse])
def list_teams(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Team).all()


@router.get("/{team_id}", response_model=TeamResponse)
def get_team(team_id: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(404, "Team not found")
    return team


@router.post("/{team_id}/members")
async def add_member(team_id: UUID, req: AddMemberRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role != "PM":
        raise HTTPException(403, "Only Project Managers (PM) can assign members and teams to projects")
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(404, "Team not found")
    if req.is_lead and user.role != "PM":
        raise HTTPException(403, "Only a PM can assign Team Leads")
    existing = db.query(TeamMembership).filter(TeamMembership.team_id == team_id, TeamMembership.user_id == req.user_id).first()
    if existing:
        raise HTTPException(400, "User already in team")
    m = TeamMembership(team_id=team_id, user_id=req.user_id, is_lead=req.is_lead)
    db.add(m)
    if req.is_lead:
        target_user = db.query(User).filter(User.id == req.user_id).first()
        if target_user and target_user.role == "TM":
            target_user.role = "TL"
    db.commit()
    event = {"type": TEAM_MEMBER_ADDED, "data": {"team_id": str(team_id), "user_id": str(req.user_id), "is_lead": req.is_lead}}
    await manager.broadcast(f"team:{team_id}", event)
    await manager.send_to_user(str(req.user_id), {"type": "notification.new", "data": {"message": f"You were added to team: {team.name}"}})
    return {"message": "Member added"}


@router.put("/{team_id}/members/{user_id}")
async def update_member(team_id: UUID, user_id: UUID, req: SetLeadRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    # Only PM can promote TM to TL (team lead assignment)
    if user.role != "PM":
        raise HTTPException(403, "Only a PM can assign Team Leads")
    m = db.query(TeamMembership).filter(TeamMembership.team_id == team_id, TeamMembership.user_id == user_id).first()
    if not m:
        raise HTTPException(404, "Member not found")
    m.is_lead = req.is_lead
    target_user = db.query(User).filter(User.id == user_id).first()
    if target_user:
        if req.is_lead and target_user.role == "TM":
            target_user.role = "TL"
        elif not req.is_lead and target_user.role == "TL":
            # Demoted: check if user is a lead in any other team
            other_lead = db.query(TeamMembership).filter(
                TeamMembership.user_id == user_id,
                TeamMembership.team_id != team_id,
                TeamMembership.is_lead == True
            ).first()
            if not other_lead:
                target_user.role = "TM"
    db.commit()
    event = {"type": TEAM_LEAD_ASSIGNED, "data": {"team_id": str(team_id), "user_id": str(user_id), "is_lead": req.is_lead}}
    await manager.broadcast(f"team:{team_id}", event)
    return {"message": "Updated"}


@router.delete("/{team_id}/members/{user_id}")
async def remove_member(team_id: UUID, user_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role != "PM":
        raise HTTPException(403, "Only Project Managers (PM) can remove team members from projects")
    m = db.query(TeamMembership).filter(TeamMembership.team_id == team_id, TeamMembership.user_id == user_id).first()
    if not m:
        raise HTTPException(404, "Member not found")
    was_lead = m.is_lead
    db.delete(m)
    if was_lead:
        target_user = db.query(User).filter(User.id == user_id).first()
        if target_user and target_user.role == "TL":
            other_lead = db.query(TeamMembership).filter(
                TeamMembership.user_id == user_id,
                TeamMembership.team_id != team_id,
                TeamMembership.is_lead == True
            ).first()
            if not other_lead:
                target_user.role = "TM"
    db.commit()
    event = {"type": TEAM_MEMBER_REMOVED, "data": {"team_id": str(team_id), "user_id": str(user_id)}}
    await manager.broadcast(f"team:{team_id}", event)
    return {"message": "Member removed"}
