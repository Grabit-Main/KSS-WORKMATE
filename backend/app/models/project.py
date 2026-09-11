import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base, engine

# Many-to-many junction table for multi-project team allocations
project_teams = Table(
    "project_teams",
    Base.metadata,
    Column("project_id", UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("team_id", UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True),
)


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    aim = Column(Text, nullable=False)
    deadline = Column(DateTime, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    # active, completed, archived
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)

    teams = relationship("Team", secondary=project_teams, back_populates="projects", lazy="subquery")
    creator = relationship("User", foreign_keys=[created_by])
    status_logs = relationship("ProjectStatusLog", back_populates="project", cascade="all, delete-orphan")
    attachments = relationship("ProjectAttachment", back_populates="project", cascade="all, delete-orphan")


class Team(Base):
    __tablename__ = "teams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    name = Column(String, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    projects = relationship("Project", secondary=project_teams, back_populates="teams", lazy="subquery")
    project = relationship("Project", foreign_keys=[project_id])
    memberships = relationship("TeamMembership", back_populates="team", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by])


# Ensure tables exist
try:
    Base.metadata.create_all(bind=engine)
except Exception:
    pass


class TeamMembership(Base):
    __tablename__ = "team_memberships"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    is_lead = Column(Boolean, default=False)
    joined_at = Column(DateTime, default=datetime.utcnow)

    team = relationship("Team", back_populates="memberships")
    user = relationship("User")


class ProjectStatusLog(Base):
    __tablename__ = "project_status_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    from_status = Column(String, nullable=False)
    to_status = Column(String, nullable=False)
    changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="status_logs")
    changer = relationship("User")


class ProjectAttachment(Base):
    __tablename__ = "project_attachments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
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

    project = relationship("Project", back_populates="attachments")
    uploader = relationship("User")

