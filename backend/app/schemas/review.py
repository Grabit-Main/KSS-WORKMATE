from typing import Optional
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
from app.schemas.user import UserResponse


class ReviewCreate(BaseModel):
    reviewee_id: UUID
    project_id: Optional[UUID] = None
    rating: int  # 1-5
    comment: str


class ReviewResponse(BaseModel):
    id: UUID
    reviewer_id: UUID
    reviewee_id: UUID
    project_id: Optional[UUID] = None
    rating: int
    comment: str
    created_at: datetime
    reviewer: UserResponse
    reviewee: UserResponse

    class Config:
        from_attributes = True
