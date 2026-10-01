from pydantic import BaseModel, field_validator
from typing import Optional, Union
from datetime import datetime
from uuid import UUID

class DocumentationBase(BaseModel):
    title: str
    description: Optional[str] = None
    project_id: Optional[str] = None # Accepts UUID string or Project Name string
    category: str = "General"
    content: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = "pdf"
    version: Optional[str] = "v1.0"
    tags: Optional[str] = None
    is_pinned: Optional[bool] = False
    gdrive_file_id: Optional[str] = None

    @field_validator('project_id', mode='before')
    def parse_project_id(cls, v):
        if v == "" or v == "null" or v == "undefined" or v is None:
            return None
        return str(v)

class DocumentationCreate(DocumentationBase):
    pass

class DocumentationUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    project_id: Optional[str] = None
    category: Optional[str] = None
    content: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    version: Optional[str] = None
    tags: Optional[str] = None
    is_pinned: Optional[bool] = None
    gdrive_file_id: Optional[str] = None

    @field_validator('project_id', mode='before')
    def parse_project_id(cls, v):
        if v == "" or v == "null" or v == "undefined" or v is None:
            return None
        return str(v)

class DocumentationResponse(DocumentationBase):
    id: UUID
    author_id: Optional[UUID] = None
    updated_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    project_name: Optional[str] = None

    class Config:
        from_attributes = True
