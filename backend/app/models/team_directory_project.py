import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

class TeamDirectoryProject(Base):
    __tablename__ = "team_directory_projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    developer_id = Column(String, nullable=False, index=True)
    developer_email = Column(String, nullable=True, index=True)
    developer_name = Column(String, nullable=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    status = Column(String, default="Active")
    progress = Column(Integer, default=0)
    start_date = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True)
    assigned_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_by_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
