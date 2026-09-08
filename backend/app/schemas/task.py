from datetime import datetime
from uuid import UUID
from typing import Optional, List
from pydantic import BaseModel
from app.schemas.user import UserResponse


class TaskCreate(BaseModel):
    team_id: Optional[UUID] = None
    project_id: Optional[UUID] = None
    title: str
    description: str
    assigned_to: UUID
    priority: str = "normal"
    deadline: Optional[datetime] = None
    scheduled_date: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    deadline: Optional[datetime] = None
    scheduled_date: Optional[str] = None
    project_id: Optional[UUID] = None


class StatusUpdate(BaseModel):
    reason: Optional[str] = None


class ReassignRequest(BaseModel):
    assigned_to: UUID


class AttachmentResponse(BaseModel):
    id: UUID
    file_name: str
    file_type: str
    file_url: str
    storage_provider: str
    created_at: datetime

    class Config:
        from_attributes = True


class StatusLogResponse(BaseModel):
    id: UUID
    from_status: str
    to_status: str
    reason: Optional[str]
    created_at: datetime
    changer: UserResponse

    class Config:
        from_attributes = True


class TaskResponse(BaseModel):
    id: UUID
    team_id: Optional[UUID] = None
    project_id: Optional[UUID] = None
    title: str
    description: str
    assigned_to: UUID
    assigned_by: UUID
    status: str
    priority: str
    deadline: Optional[datetime] = None
    scheduled_date: Optional[str] = None
    is_locked: bool
    decline_reason: Optional[str] = None
    reject_reason: Optional[str] = None
    deadline_exceeded: bool
    created_at: datetime
    updated_at: datetime
    assignee: UserResponse
    assigner: UserResponse
    attachments: List[AttachmentResponse] = []

    class Config:
        from_attributes = True
