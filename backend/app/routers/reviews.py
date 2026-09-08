from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.database import get_db
from app.models.review import Review
from app.models.notification import Notification
from app.models.project import TeamMembership
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewResponse
from app.schemas.user import UserResponse
from app.dependencies import get_current_user
from app.websocket.manager import manager
from app.websocket.events import REVIEW_SUBMITTED, NOTIFICATION_NEW

router = APIRouter(tags=["feedback"])

# Role review/feedback chains: TL→TM, PM→TL, CEO/CTO→PM
REVIEW_ALLOWED = {
    "TL": ["TM"],
    "PM": ["TL"],
    "CEO": ["PM"],
    "CTO": ["PM"],
}


@router.get("/api/feedback/targets", response_model=List[UserResponse])
def get_feedback_targets(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Return users that the current user is authorized to provide feedback to."""
    allowed_roles = REVIEW_ALLOWED.get(user.role, [])
    if not allowed_roles:
        return []

    if user.role == "PM":
        # PM gives feedback to Team Leads (users with role TL or lead of any team)
        lead_user_ids = db.query(TeamMembership.user_id).filter(TeamMembership.is_lead == True).subquery()
        return db.query(User).filter(
            (User.role == "TL") | (User.id.in_(lead_user_ids)),
            User.is_active == True
        ).all()
    elif user.role in ("CEO", "CTO"):
        # CEO/CTO can give feedback to PMs
        return db.query(User).filter(User.role.in_(allowed_roles), User.is_active == True).all()
    elif user.role == "TL":
        # TL can give feedback to TMs in teams they lead
        my_teams = db.query(TeamMembership.team_id).filter(TeamMembership.user_id == user.id, TeamMembership.is_lead == True).subquery()
        member_ids = db.query(TeamMembership.user_id).filter(TeamMembership.team_id.in_(my_teams), TeamMembership.is_lead == False).subquery()
        return db.query(User).filter(User.id.in_(member_ids), User.is_active == True).all()

    return []


@router.post("/api/feedback", response_model=ReviewResponse)
@router.post("/api/reviews", response_model=ReviewResponse)
async def submit_review(req: ReviewCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    reviewee = db.query(User).filter(User.id == req.reviewee_id).first()
    if not reviewee:
        raise HTTPException(404, "Reviewee not found")

    # Check if target is a team lead if user is PM
    allowed_roles = REVIEW_ALLOWED.get(user.role, [])
    is_tl_by_membership = False
    if user.role == "PM":
        is_tl_by_membership = bool(db.query(TeamMembership).filter(TeamMembership.user_id == req.reviewee_id, TeamMembership.is_lead == True).first())

    if reviewee.role not in allowed_roles and not (user.role == "PM" and is_tl_by_membership):
        raise HTTPException(403, f"{user.role} can only submit feedback for: {', '.join(allowed_roles)}")

    if req.rating < 1 or req.rating > 5:
        raise HTTPException(400, "Rating must be 1-5")

    review = Review(reviewer_id=user.id, **req.model_dump())
    db.add(review)

    # Persist notification in database
    notif = Notification(
        user_id=req.reviewee_id,
        title="Performance Feedback Received",
        message=f"{user.first_name} {user.last_name} ({user.role}) gave you a {req.rating}★ feedback: \"{req.comment[:60]}{'...' if len(req.comment) > 60 else ''}\"",
        event_type="review.submitted",
        ref_id=str(review.id)
    )
    db.add(notif)

    db.commit()
    db.refresh(review)

    event = {"type": REVIEW_SUBMITTED, "data": {"id": str(review.id), "reviewee_id": str(req.reviewee_id), "rating": req.rating}}
    await manager.send_to_user(str(req.reviewee_id), {
        "type": NOTIFICATION_NEW,
        "data": {
            "title": "Performance Feedback Received",
            "message": f"You received a {req.rating}★ feedback from {user.first_name} {user.last_name}!"
        }
    })
    await manager.broadcast("global:admins", event)
    return review


@router.get("/api/feedback", response_model=List[ReviewResponse])
@router.get("/api/reviews", response_model=List[ReviewResponse])
def list_feedback(
    type: str = Query("received", pattern="^(received|given|all)$"),
    user_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    q = db.query(Review)
    if user.role in ("CEO", "CTO") and type == "all":
        if user_id:
            q = q.filter((Review.reviewee_id == user_id) | (Review.reviewer_id == user_id))
    elif type == "given":
        q = q.filter(Review.reviewer_id == user.id)
    else: # received
        target = user_id if (user_id and user.role in ("CEO", "CTO", "HR", "PM")) else user.id
        q = q.filter(Review.reviewee_id == target)

    return q.order_by(Review.created_at.desc()).all()


@router.get("/api/feedback/user/{user_id}", response_model=List[ReviewResponse])
@router.get("/api/reviews/user/{user_id}", response_model=List[ReviewResponse])
def get_user_reviews(user_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role not in ("CEO", "CTO", "HR", "PM", "TL") and str(user.id) != str(user_id):
        raise HTTPException(403, "Access denied")
    return db.query(Review).filter(Review.reviewee_id == user_id).order_by(Review.created_at.desc()).all()

