from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class DailyPulseCreate(BaseModel):
    mood: Optional[str] = "good"
    summary: str
    blockers: Optional[str] = None


class DailyPulseResponse(BaseModel):
    id: UUID
    user_id: UUID
    date: str
    mood: Optional[str]
    summary: str
    blockers: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class BlockerCreate(BaseModel):
    task_id: Optional[UUID] = None
    description: str
    severity: Optional[str] = "high"


class BlockerResponse(BaseModel):
    id: UUID
    user_id: UUID
    task_id: Optional[UUID]
    description: str
    severity: str
    status: str
    created_at: datetime
    resolved_at: Optional[datetime]

    class Config:
        from_attributes = True


class HelpRequestCreate(BaseModel):
    task_id: Optional[UUID] = None
    topic: str
    details: str


class HelpRequestResponse(BaseModel):
    id: UUID
    user_id: UUID
    task_id: Optional[UUID]
    topic: str
    details: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class FocusSessionCreate(BaseModel):
    task_id: Optional[UUID] = None
    duration_mins: Optional[int] = 25
    active_duration_secs: Optional[int] = 0
    status: Optional[str] = "completed"


class FocusSessionResponse(BaseModel):
    id: UUID
    user_id: UUID
    task_id: Optional[UUID]
    duration_mins: int
    active_duration_secs: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
