from datetime import datetime
from uuid import UUID
from typing import Optional
from pydantic import BaseModel
from app.schemas.user import UserResponse


class ChatMessageCreate(BaseModel):
    message: Optional[str] = None
    attachment_url: Optional[str] = None
    attachment_type: Optional[str] = None
    storage_provider: Optional[str] = None


class ChatMessageResponse(BaseModel):
    id: UUID
    task_id: UUID
    sender_id: UUID
    message: Optional[str]
    attachment_url: Optional[str]
    attachment_type: Optional[str]
    storage_provider: Optional[str]
    created_at: datetime
    sender: UserResponse

    class Config:
        from_attributes = True
