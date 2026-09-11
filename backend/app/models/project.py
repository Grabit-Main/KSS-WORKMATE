import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


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

    teams_legacy = relationship("Team", back_populates="project")
    project_teams = relationship("ProjectTeam", back_populates="project", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by])
    status_logs = relationship("ProjectStatusLog", back_populates="project", cascade="all, delete-orphan")
    attachments = relationship("ProjectAttachment", back_populates="project", cascade="all, delete-orphan")

    @property
    def teams(self):
        pt_teams = [pt.team for pt in self.project_teams if pt.team]
        if pt_teams:
            # Deduplicate by team ID while maintaining list
            seen = set()
            unique_teams = []
            for t in pt_teams:
                if t.id not in seen:
                    seen.add(t.id)
                    unique_teams.append(t)
            return unique_teams
        return self.teams_legacy or []


class Team(Base):
    __tablename__ = "teams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    name = Column(String, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="teams_legacy")
    project_teams = relationship("ProjectTeam", back_populates="team", cascade="all, delete-orphan")
    memberships = relationship("TeamMembership", back_populates="team", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by])

    @property
    def projects(self):
        pts = [pt.project for pt in self.project_teams if pt.project]
        if pts:
            seen = set()
            unique_projects = []
            for p in pts:
                if p.id not in seen:
                    seen.add(p.id)
                    unique_projects.append(p)
            return unique_projects
        return [self.project] if self.project else []


class ProjectTeam(Base):
    __tablename__ = "project_teams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="project_teams")
    team = relationship("Team", back_populates="project_teams")


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

