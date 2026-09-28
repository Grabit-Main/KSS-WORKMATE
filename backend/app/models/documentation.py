import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base, engine

class Documentation(Base):
    __tablename__ = "documentations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    category = Column(String, nullable=False, default="General")
    content = Column(Text, nullable=False)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    version = Column(String, default="v1.0")
    tags = Column(String, nullable=True) # comma separated tags
    is_pinned = Column(Boolean, default=False)

    project = relationship("Project", foreign_keys=[project_id])
    author = relationship("User", foreign_keys=[author_id])

# Ensure table exists
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print("Error creating documentations table:", e)
