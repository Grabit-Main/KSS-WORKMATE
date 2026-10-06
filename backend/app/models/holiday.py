import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Holiday(Base):
    __tablename__ = "holidays"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    date = Column(String, nullable=False)  # Format: "YYYY-MM-DD"
    day_of_week = Column(String, nullable=True)  # e.g. "Monday"
    type = Column(String, default="Paid Off")  # e.g. "Paid Off", "Optional Off"
    description = Column(String, nullable=True)
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
