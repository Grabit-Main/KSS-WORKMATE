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

    @field_serializer('created_at')
    def serialize_created_at(self, dt: datetime, _info):
        if dt:
            iso = dt.isoformat()
            if not iso.endswith('Z') and '+' not in iso:
                return iso + 'Z'
            return iso
        return None

    class Config:
        from_attributes = True
