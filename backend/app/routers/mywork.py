from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.database import get_db, Base, engine
from app.models.user import User
from app.models.task import Task
from app.models.project import Team, TeamMembership
from app.models.mywork import DailyPulse, MyWorkBlocker, MyWorkHelpRequest, MyWorkFocusSession
from app.schemas.mywork import (
    DailyPulseCreate, DailyPulseResponse,
    BlockerCreate, BlockerResponse,
    HelpRequestCreate, HelpRequestResponse,
    FocusSessionCreate, FocusSessionResponse
)
from app.dependencies import get_current_user
from app.websocket.manager import manager
from app.websocket.events import ANALYTICS_REFRESH

# Ensure database tables exist automatically
Base.metadata.create_all(bind=engine)

router = APIRouter(prefix="/api/mywork", tags=["mywork"])


def _can_access_user_data(user: User, target_user_id: UUID, db: Session) -> bool:
    if str(user.id) == str(target_user_id):
        return True
    if user.role in ("CEO", "CTO", "PM"):
        return True
    if user.role == "TL":
        my_team_ids = [tm.team_id for tm in db.query(TeamMembership.team_id).filter(TeamMembership.user_id == user.id).all()]
        if my_team_ids:
            is_member = db.query(TeamMembership).filter(
                TeamMembership.team_id.in_(my_team_ids),
                TeamMembership.user_id == target_user_id
            ).first() is not None
            if is_member:
                return True
    return False


# --- DAILY PULSE ---

@router.get("/pulse", response_model=List[DailyPulseResponse])
def get_daily_pulses(
    user_id: Optional[UUID] = Query(None),
    date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    target_id = user_id or user.id
    if not _can_access_user_data(user, target_id, db):
        raise HTTPException(403, "Not authorized to view this developer's daily pulse")

    q = db.query(DailyPulse).filter(DailyPulse.user_id == target_id)
    if date:
        q = q.filter(DailyPulse.date == date)
    return q.order_by(DailyPulse.created_at.desc()).all()


@router.post("/pulse", response_model=DailyPulseResponse)
async def submit_daily_pulse(
    req: DailyPulseCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    existing = db.query(DailyPulse).filter(
        DailyPulse.user_id == user.id,
        DailyPulse.date == today_str
    ).first()

    if existing:
        existing.mood = req.mood
        existing.summary = req.summary
        existing.blockers = req.blockers
        existing.created_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        pulse = existing
    else:
        pulse = DailyPulse(
            user_id=user.id,
            date=today_str,
            mood=req.mood,
            summary=req.summary,
            blockers=req.blockers
        )
        db.add(pulse)
        db.commit()
        db.refresh(pulse)

    await manager.broadcast({"type": ANALYTICS_REFRESH, "data": {"user_id": str(user.id), "event": "daily_pulse"}})
    return pulse


# --- BLOCKERS ---

@router.get("/blockers", response_model=List[BlockerResponse])
def get_blockers(
    user_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    target_id = user_id or user.id
    if not _can_access_user_data(user, target_id, db):
        raise HTTPException(403, "Not authorized to view this developer's blockers")

    return db.query(MyWorkBlocker).filter(MyWorkBlocker.user_id == target_id).order_by(MyWorkBlocker.created_at.desc()).all()


@router.post("/blockers", response_model=BlockerResponse)
async def report_blocker(
    req: BlockerCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    blocker = MyWorkBlocker(
        user_id=user.id,
        task_id=req.task_id,
        description=req.description,
        severity=req.severity or "high",
        status="open"
    )
    db.add(blocker)

    if req.task_id:
        task = db.query(Task).filter(Task.id == req.task_id).first()
        if task:
            task.status = "blocked"
            task.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(blocker)

    await manager.broadcast({"type": ANALYTICS_REFRESH, "data": {"user_id": str(user.id), "event": "blocker_reported"}})
    return blocker


@router.put("/blockers/{blocker_id}/resolve", response_model=BlockerResponse)
async def resolve_blocker(
    blocker_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    blocker = db.query(MyWorkBlocker).filter(MyWorkBlocker.id == blocker_id).first()
    if not blocker:
        raise HTTPException(404, "Blocker not found")

    if not _can_access_user_data(user, blocker.user_id, db):
        raise HTTPException(403, "Not authorized to manage this blocker")

    blocker.status = "resolved"
    blocker.resolved_at = datetime.utcnow()

    if blocker.task_id:
        task = db.query(Task).filter(Task.id == blocker.task_id).first()
        if task and task.status == "blocked":
            task.status = "in_progress"
            task.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(blocker)
    return blocker


# --- HELP REQUESTS ---

@router.get("/help", response_model=List[HelpRequestResponse])
def get_help_requests(
    user_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    target_id = user_id or user.id
    if not _can_access_user_data(user, target_id, db):
        raise HTTPException(403, "Not authorized to view this developer's help requests")

    return db.query(MyWorkHelpRequest).filter(MyWorkHelpRequest.user_id == target_id).order_by(MyWorkHelpRequest.created_at.desc()).all()


@router.post("/help", response_model=HelpRequestResponse)
async def request_help(
    req: HelpRequestCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    help_req = MyWorkHelpRequest(
        user_id=user.id,
        task_id=req.task_id,
        topic=req.topic,
        details=req.details,
        status="open"
    )
    db.add(help_req)
    db.commit()
    db.refresh(help_req)

    await manager.broadcast({"type": ANALYTICS_REFRESH, "data": {"user_id": str(user.id), "event": "help_requested"}})
    return help_req


# --- FOCUS SESSIONS ---

@router.get("/focus", response_model=List[FocusSessionResponse])
def get_focus_sessions(
    user_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    target_id = user_id or user.id
    if not _can_access_user_data(user, target_id, db):
        raise HTTPException(403, "Not authorized to view this developer's focus sessions")

    return db.query(MyWorkFocusSession).filter(MyWorkFocusSession.user_id == target_id).order_by(MyWorkFocusSession.created_at.desc()).all()


@router.post("/focus", response_model=FocusSessionResponse)
async def save_focus_session(
    req: FocusSessionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    session = MyWorkFocusSession(
        user_id=user.id,
        task_id=req.task_id,
        duration_mins=req.duration_mins or 25,
        active_duration_secs=req.active_duration_secs or 0,
        status=req.status or "completed"
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    await manager.broadcast({"type": ANALYTICS_REFRESH, "data": {"user_id": str(user.id), "event": "focus_completed"}})
    return session
