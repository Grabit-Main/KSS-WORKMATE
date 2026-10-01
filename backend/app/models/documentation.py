import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base, engine

class Documentation(Base):
    __tablename__ = "documentations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    category = Column(String, nullable=False, default="General")
    content = Column(Text, nullable=True)
    file_url = Column(String, nullable=True)
    file_name = Column(String, nullable=True)
    file_type = Column(String, nullable=True, default="pdf")
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    version = Column(String, default="v1.0")
    tags = Column(String, nullable=True) # comma separated tags
    is_pinned = Column(Boolean, default=False)
    gdrive_file_id = Column(String, nullable=True)

    project = relationship("Project", foreign_keys=[project_id])
    author = relationship("User", foreign_keys=[author_id])

# Ensure table exists and missing columns are safely created
try:
    Base.metadata.create_all(bind=engine)
    from sqlalchemy import text
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE documentations ADD COLUMN IF NOT EXISTS gdrive_file_id VARCHAR;"))
        conn.commit()
except Exception as e:
    print("Error updating documentations table schema:", e)
