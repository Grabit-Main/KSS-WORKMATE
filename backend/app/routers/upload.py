from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional
from app.database import get_db
from app.models.task import TaskAttachment, Task
from app.models.project import Project, Team, ProjectAttachment
from app.models.user import User
from app.dependencies import get_current_user
from app.services import cloudinary_service, gdrive_service

router = APIRouter(prefix="/api/upload", tags=["upload"])

IMAGE_VIDEO_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/quicktime", "video/webm"}


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    task_id: Optional[UUID] = Form(None),
    project_id: Optional[UUID] = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not task_id and not project_id:
        raise HTTPException(400, "Either task_id or project_id must be provided")

    content = await file.read()
    mime = file.content_type or ""

    if project_id:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(404, "Project not found")

        if mime in IMAGE_VIDEO_TYPES:
            result = cloudinary_service.upload_file(content, file.filename, folder=f"workmate/projects/{project.id}")
            attachment = ProjectAttachment(
                project_id=project_id,
                uploaded_by=user.id,
                file_name=file.filename,
                file_type="image" if mime.startswith("image") else "video",
                file_url=result["url"],
                storage_provider="cloudinary",
                cloudinary_public_id=result.get("public_id"),
            )
        else:
            try:
                result = gdrive_service.upload_file(content, file.filename, project.name, "overview")
                attachment = ProjectAttachment(
                    project_id=project_id,
                    uploaded_by=user.id,
                    file_name=file.filename,
                    file_type="document",
                    file_url=result["url"],
                    storage_provider="gdrive",
                    gdrive_file_id=result.get("file_id"),
                )
            except Exception:
                result = cloudinary_service.upload_file(content, file.filename, folder=f"workmate/projects/{project.id}")
                attachment = ProjectAttachment(
                    project_id=project_id,
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

    elif task_id:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise HTTPException(404, "Task not found")

        if mime in IMAGE_VIDEO_TYPES:
            result = cloudinary_service.upload_file(content, file.filename)
            attachment = TaskAttachment(
                task_id=task_id,
                uploaded_by=user.id,
                file_name=file.filename,
                file_type="image" if mime.startswith("image") else "video",
                file_url=result["url"],
                storage_provider="cloudinary",
                cloudinary_public_id=result.get("public_id"),
            )
        else:
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


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    mime = file.content_type or ""
    if not mime.startswith("image/"):
        raise HTTPException(400, "Only image files (JPEG, PNG, WEBP, GIF) are allowed for profile pictures")

    content = await file.read()
    avatar_url = None
    try:
        result = cloudinary_service.upload_file(content, file.filename, folder=f"workmate/avatars/{user.id}")
        avatar_url = result.get("url")
    except Exception as e:
        print(f"[AVATAR] Cloudinary upload exception: {e}, using base64 fallback")

    if not avatar_url:
        import base64
        b64 = base64.b64encode(content).decode("utf-8")
        avatar_url = f"data:{mime};base64,{b64}"

    user.avatar_url = avatar_url
    db.commit()
    db.refresh(user)
    return {"url": avatar_url, "message": "Avatar uploaded successfully"}

