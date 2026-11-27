from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class TeamDirectoryProjectBase(BaseModel):
    developer_id: str
    developer_email: Optional[str] = None
    developer_name: Optional[str] = None
    name: str
    role: str
    status: Optional[str] = "Active"
    progress: Optional[int] = 0
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None

class TeamDirectoryProjectCreate(TeamDirectoryProjectBase):
    pass

class TeamDirectoryProjectUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None

class TeamDirectoryProjectResponse(TeamDirectoryProjectBase):
    id: UUID
    assigned_by: Optional[UUID] = None
    assigned_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
