from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app.models.review import Review
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewResponse
from app.dependencies import get_current_user
from app.websocket.manager import manager
from app.websocket.events import REVIEW_SUBMITTED, NOTIFICATION_NEW

router = APIRouter(prefix="/api/reviews", tags=["reviews"])

# Role review chains: TL→TM, PM→TL, CEO/CTO→PM
REVIEW_ALLOWED = {
    "TL": ["TM"],
    "PM": ["TL"],
    "CEO": ["PM"],
    "CTO": ["PM"],
}


@router.post("", response_model=ReviewResponse)
async def submit_review(req: ReviewCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    reviewee = db.query(User).filter(User.id == req.reviewee_id).first()
    if not reviewee:
        raise HTTPException(404, "Reviewee not found")
    allowed_roles = REVIEW_ALLOWED.get(user.role, [])
    if reviewee.role not in allowed_roles:
        raise HTTPException(403, f"{user.role} can only review: {', '.join(allowed_roles)}")
    if req.rating < 1 or req.rating > 5:
        raise HTTPException(400, "Rating must be 1-5")
    review = Review(reviewer_id=user.id, **req.model_dump())
    db.add(review)
    db.commit()
    db.refresh(review)
    event = {"type": REVIEW_SUBMITTED, "data": {"id": str(review.id), "reviewee_id": str(req.reviewee_id), "rating": req.rating}}
    await manager.send_to_user(str(req.reviewee_id), {"type": NOTIFICATION_NEW, "data": {"message": f"You received a {req.rating}★ review!"}})
    await manager.broadcast("global:admins", event)
    return review


@router.get("/user/{user_id}", response_model=List[ReviewResponse])
def get_user_reviews(user_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role not in ("CEO", "CTO", "HR", "PM", "TL") and str(user.id) != str(user_id):
        raise HTTPException(403, "Access denied")
    return db.query(Review).filter(Review.reviewee_id == user_id).order_by(Review.created_at.desc()).all()
