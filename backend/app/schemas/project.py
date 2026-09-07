from datetime import datetime
from uuid import UUID
from typing import Optional, List
from pydantic import BaseModel
from app.schemas.user import UserResponse


class ProjectCreate(BaseModel):
    name: str
    aim: str
    deadline: Optional[datetime] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    aim: Optional[str] = None
    deadline: Optional[datetime] = None
    status: Optional[str] = None


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    aim: str
    deadline: Optional[datetime]
    status: str
    created_by: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class TeamCreate(BaseModel):
    project_id: UUID
    name: str


class TeamUpdate(BaseModel):
    name: Optional[str] = None


class MembershipResponse(BaseModel):
    id: UUID
    user_id: UUID
    team_id: UUID
    is_lead: bool
    joined_at: datetime
    user: UserResponse

    class Config:
        from_attributes = True


class TeamResponse(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    created_by: UUID
    created_at: datetime
    memberships: List[MembershipResponse] = []

    class Config:
        from_attributes = True


class AddMemberRequest(BaseModel):
    user_id: UUID
    is_lead: bool = False


class SetLeadRequest(BaseModel):
    is_lead: bool
