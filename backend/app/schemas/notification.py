from datetime import datetime
from uuid import UUID
from typing import Optional
from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    message: str
    event_type: str
    ref_id: Optional[str]
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
