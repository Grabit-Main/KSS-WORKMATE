from datetime import datetime
from uuid import UUID
from typing import Optional, List
from pydantic import BaseModel
from app.schemas.user import UserResponse


class MembershipResponse(BaseModel):
    id: UUID
    user_id: UUID
    team_id: UUID
    is_lead: bool
    joined_at: datetime
    user: UserResponse

    class Config:
        from_attributes = True


class TeamCreate(BaseModel):
    project_id: Optional[UUID] = None
    name: str
    lead_user_id: Optional[UUID] = None
    member_user_ids: Optional[List[UUID]] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    project_id: Optional[UUID] = None
    lead_user_id: Optional[UUID] = None


class TeamResponse(BaseModel):
    id: UUID
    project_id: Optional[UUID] = None
    name: str
    created_by: UUID
    created_at: datetime
    memberships: List[MembershipResponse] = []

    class Config:
        from_attributes = True


class ProjectAttachmentResponse(BaseModel):
    id: UUID
    file_name: str
    file_type: str
    file_url: str
    storage_provider: str
    created_at: datetime

    class Config:
        from_attributes = True


class ProjectCreate(BaseModel):
    name: str
    aim: str
    deadline: Optional[datetime] = None
    team_id: Optional[UUID] = None
    team_ids: Optional[List[UUID]] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    aim: Optional[str] = None
    deadline: Optional[datetime] = None
    status: Optional[str] = None
    team_id: Optional[UUID] = None
    team_ids: Optional[List[UUID]] = None


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    aim: str
    deadline: Optional[datetime]
    status: str
    created_by: UUID
    created_at: datetime
    teams: List[TeamResponse] = []
    attachments: List[ProjectAttachmentResponse] = []

    class Config:
        from_attributes = True


class AddMemberRequest(BaseModel):
    user_id: UUID
    is_lead: bool = False


class SetLeadRequest(BaseModel):
    is_lead: bool
