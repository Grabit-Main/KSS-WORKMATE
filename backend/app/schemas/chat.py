from datetime import datetime
from uuid import UUID
from typing import Optional
from pydantic import BaseModel, field_serializer
from app.schemas.user import UserResponse


class ChatMessageCreate(BaseModel):
    message: Optional[str] = None
    attachment_url: Optional[str] = None
    attachment_type: Optional[str] = None
    storage_provider: Optional[str] = None
    chat_type: Optional[str] = None
    receiver_id: Optional[UUID] = None
    project_id: Optional[UUID] = None
    team_id: Optional[UUID] = None


class ChatMessageResponse(BaseModel):
    id: UUID
    task_id: Optional[UUID] = None
    project_id: Optional[UUID] = None
    team_id: Optional[UUID] = None
    receiver_id: Optional[UUID] = None
    sender_id: UUID
    message: Optional[str] = None
    attachment_url: Optional[str] = None
    attachment_type: Optional[str] = None
    storage_provider: Optional[str] = None
    chat_type: Optional[str] = None
    created_at: Optional[datetime] = None
    sender: Optional[UserResponse] = None
    receiver: Optional[UserResponse] = None

    @field_serializer('created_at')
    def serialize_created_at(self, dt: Optional[datetime], _info):
        if dt:
            iso = dt.isoformat()
            if not iso.endswith('Z') and '+' not in iso:
                return iso + 'Z'
            return iso
        return None

    class Config:
        from_attributes = True
