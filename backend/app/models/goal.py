import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Goal(Base):
    __tablename__ = "goals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    category = Column(String, nullable=True, default="Technical Skills")
    type = Column(String, nullable=True, default="Technical")
    priority = Column(String, nullable=True, default="Medium")
    start_date = Column(String, nullable=True) # YYYY-MM-DD or DD MMM YYYY
    target_date = Column(String, nullable=True) # YYYY-MM-DD or DD MMM YYYY
    duration = Column(String, nullable=True)
    progress = Column(Integer, default=0)
    milestones_completed = Column(Integer, default=0)
    milestones_total = Column(Integer, default=0)
    update_frequency = Column(String, nullable=True, default="Daily")
    status = Column(String, default="In Progress")
    time_spent = Column(String, default="0 hrs")
    icon_type = Column(String, nullable=True, default="react")
    description = Column(Text, nullable=True)
    target_outcome = Column(Text, nullable=True)
    next_steps = Column(Text, nullable=True)
    challenges = Column(Text, nullable=True)
    activities = Column(Text, nullable=True)
    resources = Column(JSON, default=list) # e.g. ["React_Notes.pdf"]
    milestones = Column(JSON, default=list) # e.g. [{"id": 1, "text": "...", "status": "Completed"}]
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
