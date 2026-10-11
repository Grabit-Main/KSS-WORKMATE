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


def _parse_uuid(val: Optional[str]) -> Optional[UUID]:
    if not val:
        return None
    val_str = str(val).strip().lower()
    if val_str in ("undefined", "null", "", "all", "none"):
        return None
    try:
        return UUID(str(val).strip())
    except (ValueError, TypeError):
        return None


def _can_access_user_data(user: User, target_user_id: UUID, db: Session) -> bool:
    if user.role in ("CEO", "CTO", "PM", "TL"):
        return True
    return str(user.id) == str(target_user_id)


# --- DAILY PULSE ---

@router.get("/pulse", response_model=List[DailyPulseResponse])
def get_daily_pulses(
    user_id: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    parsed_user_id = _parse_uuid(user_id)
    if parsed_user_id:
        if not _can_access_user_data(user, parsed_user_id, db):
            raise HTTPException(403, "Not authorized to view this developer's daily pulse")
        q = db.query(DailyPulse).filter(DailyPulse.user_id == parsed_user_id)
    elif user.role in ("CEO", "CTO", "PM", "TL"):
        q = db.query(DailyPulse)
    else:
        q = db.query(DailyPulse).filter(DailyPulse.user_id == user.id)

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

    await manager.broadcast("global:all", {"type": ANALYTICS_REFRESH, "data": {"user_id": str(user.id), "event": "daily_pulse"}})
    return pulse


# --- BLOCKERS ---

@router.get("/blockers", response_model=List[BlockerResponse])
def get_blockers(
    user_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    parsed_user_id = _parse_uuid(user_id)
    if parsed_user_id:
        if not _can_access_user_data(user, parsed_user_id, db):
            raise HTTPException(403, "Not authorized to view this developer's blockers")
        q = db.query(MyWorkBlocker).filter(MyWorkBlocker.user_id == parsed_user_id)
    elif user.role in ("CEO", "CTO", "PM", "TL"):
        q = db.query(MyWorkBlocker)
    else:
        q = db.query(MyWorkBlocker).filter(MyWorkBlocker.user_id == user.id)

    return q.order_by(MyWorkBlocker.created_at.desc()).all()


@router.post("/blockers", response_model=BlockerResponse)
async def report_blocker(
    req: BlockerCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    valid_task_id = None
    if req.task_id:
        task_exists = db.query(Task.id).filter(Task.id == req.task_id).first()
        if task_exists:
            valid_task_id = req.task_id

    blocker = MyWorkBlocker(
        user_id=user.id,
        task_id=valid_task_id,
        description=req.description,
        severity=req.severity or "high",
        status="open"
    )
    db.add(blocker)

    if valid_task_id:
        task = db.query(Task).filter(Task.id == valid_task_id).first()
        if task:
            task.status = "blocked"
            task.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(blocker)

    await manager.broadcast("global:all", {"type": ANALYTICS_REFRESH, "data": {"user_id": str(user.id), "event": "blocker_reported"}})
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
    user_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    parsed_user_id = _parse_uuid(user_id)
    if parsed_user_id:
        if not _can_access_user_data(user, parsed_user_id, db):
            raise HTTPException(403, "Not authorized to view this developer's help requests")
        q = db.query(MyWorkHelpRequest).filter(MyWorkHelpRequest.user_id == parsed_user_id)
    elif user.role in ("CEO", "CTO", "PM", "TL"):
        q = db.query(MyWorkHelpRequest)
    else:
        q = db.query(MyWorkHelpRequest).filter(MyWorkHelpRequest.user_id == user.id)

    return q.order_by(MyWorkHelpRequest.created_at.desc()).all()


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

    await manager.broadcast("global:all", {"type": ANALYTICS_REFRESH, "data": {"user_id": str(user.id), "event": "help_requested"}})
    return help_req


# --- FOCUS SESSIONS ---

@router.get("/focus", response_model=List[FocusSessionResponse])
def get_focus_sessions(
    user_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    parsed_user_id = _parse_uuid(user_id)
    if parsed_user_id:
        if not _can_access_user_data(user, parsed_user_id, db):
            raise HTTPException(403, "Not authorized to view this developer's focus sessions")
        q = db.query(MyWorkFocusSession).filter(MyWorkFocusSession.user_id == parsed_user_id)
    elif user.role in ("CEO", "CTO", "PM", "TL"):
        q = db.query(MyWorkFocusSession)
    else:
        q = db.query(MyWorkFocusSession).filter(MyWorkFocusSession.user_id == user.id)

    return q.order_by(MyWorkFocusSession.created_at.desc()).all()



@router.post("/focus", response_model=FocusSessionResponse)
async def save_focus_session(
    req: FocusSessionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # Verify task existence to satisfy FK constraint if task_id provided
    valid_task_id = None
    if req.task_id:
        task_exists = db.query(Task.id).filter(Task.id == req.task_id).first()
        if task_exists:
            valid_task_id = req.task_id

    accomplishment_text = (req.accomplishment or req.accomplishment_summary or "").strip() or None
    remaining_work_text = (req.remaining_work or "").strip() or None
    start_dt = req.started_at or req.start_time
    end_dt = req.ended_at or req.end_time or datetime.utcnow()
    duration_minutes = req.duration_mins or (round(req.active_duration_secs / 60) if req.active_duration_secs else 25)

    # Prevent duplicate submissions / duplicate records if session_id provided
    if req.session_id:
        existing = db.query(MyWorkFocusSession).filter(
            MyWorkFocusSession.user_id == user.id,
            MyWorkFocusSession.session_id == req.session_id
        ).first()
        if existing:
            if accomplishment_text is not None:
                existing.accomplishment = accomplishment_text
            if remaining_work_text is not None:
                existing.remaining_work = remaining_work_text
            if valid_task_id:
                existing.task_id = valid_task_id
            if req.active_duration_secs:
                existing.active_duration_secs = req.active_duration_secs
            if duration_minutes:
                existing.duration_mins = duration_minutes
            if req.status:
                existing.status = req.status
            if end_dt:
                existing.ended_at = end_dt
            db.commit()
            db.refresh(existing)
            await manager.broadcast("global:all", {"type": ANALYTICS_REFRESH, "data": {"user_id": str(user.id), "event": "focus_completed"}})
            return existing

    session = MyWorkFocusSession(
        session_id=req.session_id,
        user_id=user.id,
        task_id=valid_task_id,
        duration_mins=duration_minutes,
        active_duration_secs=req.active_duration_secs or 0,
        status=req.status or "completed",
        accomplishment=accomplishment_text,
        remaining_work=remaining_work_text,
        started_at=start_dt,
        ended_at=end_dt
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    await manager.broadcast("global:all", {"type": ANALYTICS_REFRESH, "data": {"user_id": str(user.id), "event": "focus_completed"}})
    return session
