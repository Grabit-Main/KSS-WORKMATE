from pydantic import BaseModel, field_validator
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
    session_id: Optional[str] = None
    task_id: Optional[UUID] = None
    duration_mins: Optional[int] = 25
    active_duration_secs: Optional[int] = 0
    status: Optional[str] = "completed"
    accomplishment: Optional[str] = None
    accomplishment_summary: Optional[str] = None
    remaining_work: Optional[str] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

    @field_validator("task_id", mode="before")
    def validate_task_id(cls, v):
        if not v or v == "" or v == "general" or v == "undefined" or v == "null":
            return None
        if isinstance(v, UUID):
            return v
        try:
            return UUID(str(v))
        except (ValueError, TypeError):
            return None


class FocusSessionResponse(BaseModel):
    id: UUID
    session_id: Optional[str] = None
    user_id: UUID
    task_id: Optional[UUID] = None
    duration_mins: int
    active_duration_secs: int
    status: str
    accomplishment: Optional[str] = None
    accomplishment_summary: Optional[str] = None
    remaining_work: Optional[str] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
