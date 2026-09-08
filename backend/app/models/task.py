import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assigned_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    # not_started, in_progress, in_review, completed, blocked
    status = Column(String, default="not_started")
    # low, normal, high, urgent
    priority = Column(String, default="normal")
    deadline = Column(DateTime, nullable=True)
    scheduled_date = Column(String, nullable=True)
    is_locked = Column(Boolean, default=False)
    decline_reason = Column(Text, nullable=True)
    reject_reason = Column(Text, nullable=True)
    deadline_exceeded = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    team = relationship("Team")
    project = relationship("Project")
    assignee = relationship("User", foreign_keys=[assigned_to])
    assigner = relationship("User", foreign_keys=[assigned_by])
    attachments = relationship("TaskAttachment", back_populates="task", cascade="all, delete-orphan")
    status_logs = relationship("TaskStatusLog", back_populates="task", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="task", cascade="all, delete-orphan")


class TaskAttachment(Base):
    __tablename__ = "task_attachments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    file_name = Column(String, nullable=False)
    # image, video, document
    file_type = Column(String, nullable=False)
    file_url = Column(String, nullable=False)
    # cloudinary or gdrive
    storage_provider = Column(String, nullable=False)
    cloudinary_public_id = Column(String, nullable=True)
    gdrive_file_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("Task", back_populates="attachments")
    uploader = relationship("User")


class TaskStatusLog(Base):
    __tablename__ = "task_status_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=False)
    from_status = Column(String, nullable=False)
    to_status = Column(String, nullable=False)
    changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("Task", back_populates="status_logs")
    changer = relationship("User")
