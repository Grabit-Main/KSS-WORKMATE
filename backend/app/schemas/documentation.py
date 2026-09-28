from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class DocumentationBase(BaseModel):
    title: str
    description: Optional[str] = None
    project_id: Optional[UUID] = None
    category: str = "General"
    content: str
    version: Optional[str] = "v1.0"
    tags: Optional[str] = None
    is_pinned: Optional[bool] = False

class DocumentationCreate(DocumentationBase):
    pass

class DocumentationUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    project_id: Optional[UUID] = None
    category: Optional[str] = None
    content: Optional[str] = None
    version: Optional[str] = None
    tags: Optional[str] = None
    is_pinned: Optional[bool] = None

class DocumentationResponse(DocumentationBase):
    id: UUID
    author_id: Optional[UUID] = None
    updated_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    project_name: Optional[str] = None

    class Config:
        from_attributes = True
