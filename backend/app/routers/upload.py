from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from uuid import UUID
from app.database import get_db
from app.models.task import TaskAttachment, Task
from app.models.project import Project, Team
from app.models.user import User
from app.dependencies import get_current_user
from app.services import cloudinary_service, gdrive_service

router = APIRouter(prefix="/api/upload", tags=["upload"])

IMAGE_VIDEO_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/quicktime", "video/webm"}


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    task_id: UUID = Form(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")

    content = await file.read()
    mime = file.content_type or ""

    if mime in IMAGE_VIDEO_TYPES:
        result = cloudinary_service.upload_file(content, file.filename)
        attachment = TaskAttachment(
            task_id=task_id,
            uploaded_by=user.id,
            file_name=file.filename,
            file_type="image" if mime.startswith("image") else "video",
            file_url=result["url"],
            storage_provider="cloudinary",
            cloudinary_public_id=result["public_id"],
        )
    else:
        # Get project name for folder hierarchy
        team = db.query(Team).filter(Team.id == task.team_id).first()
        project = db.query(Project).filter(Project.id == team.project_id).first() if team else None
        project_name = project.name if project else "General"
        try:
            result = gdrive_service.upload_file(content, file.filename, project_name, str(task_id))
            attachment = TaskAttachment(
                task_id=task_id,
                uploaded_by=user.id,
                file_name=file.filename,
                file_type="document",
                file_url=result["url"],
                storage_provider="gdrive",
                gdrive_file_id=result.get("file_id"),
            )
        except Exception:
            # Fallback to Cloudinary raw upload
            result = cloudinary_service.upload_file(content, file.filename)
            attachment = TaskAttachment(
                task_id=task_id,
                uploaded_by=user.id,
                file_name=file.filename,
                file_type="document",
                file_url=result["url"],
                storage_provider="cloudinary",
                cloudinary_public_id=result.get("public_id"),
            )

    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return {"url": attachment.file_url, "file_type": attachment.file_type, "storage_provider": attachment.storage_provider}
