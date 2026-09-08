from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app.models.project import Team, TeamMembership, Project
from app.models.user import User
from app.schemas.project import TeamCreate, TeamUpdate, TeamResponse, AddMemberRequest, SetLeadRequest
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
    db.flush()

    if req.lead_user_id:
        lead_user = db.query(User).filter(User.id == req.lead_user_id).first()
        if lead_user and lead_user.role in ("CEO", "CTO", "PM"):
            raise HTTPException(400, f"{lead_user.role} cannot be assigned as a Team Lead")
        lead_m = TeamMembership(team_id=team.id, user_id=req.lead_user_id, is_lead=True)
        db.add(lead_m)
        if lead_user and lead_user.role == "TM":
            lead_user.role = "TL"

    if req.member_user_ids:
        for uid in req.member_user_ids:
            if req.lead_user_id and str(uid) == str(req.lead_user_id):
                continue
            m_user = db.query(User).filter(User.id == uid).first()
            if m_user and m_user.role in ("CEO", "CTO", "PM"):
                continue
            m = TeamMembership(team_id=team.id, user_id=uid, is_lead=False)
            db.add(m)

    db.commit()
    db.refresh(team)
    event = {"type": TEAM_CREATED, "data": {"id": str(team.id), "name": team.name, "project_id": str(req.project_id) if req.project_id else None}}
    await manager.broadcast("global:admins", event)
    if req.project_id:
        await manager.broadcast(f"project:{req.project_id}", event)
    return team


@router.get("", response_model=List[TeamResponse])
def list_teams(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role in ("CEO", "CTO", "HR", "PM"):
        return db.query(Team).all()
    # TL and TM see teams they are member or lead of
    team_ids = db.query(TeamMembership.team_id).filter(TeamMembership.user_id == user.id).subquery()
    return db.query(Team).filter(Team.id.in_(team_ids)).all()


@router.get("/{team_id}", response_model=TeamResponse)
def get_team(team_id: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(404, "Team not found")
    return team


@router.put("/{team_id}", response_model=TeamResponse)
async def update_team(team_id: UUID, req: TeamUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role != "PM":
        raise HTTPException(403, "Only Project Managers (PM) can manage and reallocate teams")
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(404, "Team not found")
    if req.name is not None:
        team.name = req.name
    if req.project_id is not None:
        team.project_id = req.project_id
    db.commit()
    db.refresh(team)
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
    target_user = db.query(User).filter(User.id == req.user_id).first()
    if not target_user:
        raise HTTPException(404, "User not found")
    if target_user.role in ("CEO", "CTO", "PM"):
        raise HTTPException(400, f"{target_user.role} cannot be added to a team squad")
    m = TeamMembership(team_id=team_id, user_id=req.user_id, is_lead=req.is_lead)
    db.add(m)
    if req.is_lead:
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
