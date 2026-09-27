import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class DailyPulse(Base):
    __tablename__ = "daily_pulses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    date = Column(String, nullable=False) # YYYY-MM-DD
    mood = Column(String, nullable=True) # great, good, neutral, struggling
    summary = Column(Text, nullable=False)
    blockers = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


class MyWorkBlocker(Base):
    __tablename__ = "mywork_blockers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=True)
    description = Column(Text, nullable=False)
    severity = Column(String, default="high") # low, medium, high, critical
    status = Column(String, default="open") # open, in_progress, resolved
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    user = relationship("User")
    task = relationship("Task")


class MyWorkHelpRequest(Base):
    __tablename__ = "mywork_help_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=True)
    topic = Column(String, nullable=False)
    details = Column(Text, nullable=False)
    status = Column(String, default="open") # open, in_progress, resolved
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    task = relationship("Task")


class MyWorkFocusSession(Base):
    __tablename__ = "mywork_focus_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=True)
    duration_mins = Column(Integer, default=25)
    active_duration_secs = Column(Integer, default=0)
    status = Column(String, default="completed") # completed, stopped
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    task = relationship("Task")
