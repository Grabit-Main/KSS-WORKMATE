from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List
from uuid import UUID
from app.database import get_db
from app.models.chat import ChatMessage
from app.models.task import Task
from app.models.project import Project, TeamMembership
from app.models.user import User
from app.models.notification import Notification
from app.schemas.chat import ChatMessageCreate, ChatMessageResponse
from app.dependencies import get_current_user
from app.websocket.manager import manager
from app.websocket.events import CHAT_NEW_MESSAGE

router = APIRouter(tags=["chat"])


def _can_chat(db, task, user):
    """Only assigned member and assigner can access task chat."""
    if str(task.assigned_to) == str(user.id) or str(task.assigned_by) == str(user.id):
        return True
    return False


# ==========================================
# Task Chat (Existing Endpoints)
# ==========================================

@router.get("/api/tasks/{task_id}/chat", response_model=List[ChatMessageResponse])
def get_chat(task_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task or not _can_chat(db, task, user):
        raise HTTPException(403, "Access denied: This conversation is private between the assignee and assigner.")
    return db.query(ChatMessage).filter(ChatMessage.task_id == task_id).order_by(ChatMessage.created_at.asc()).all()


@router.post("/api/tasks/{task_id}/chat", response_model=ChatMessageResponse)
async def send_message(task_id: UUID, req: ChatMessageCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task or not _can_chat(db, task, user):
        raise HTTPException(403, "Access denied: This conversation is private between the assignee and assigner.")
    msg_data = req.model_dump()
    if not msg_data.get("chat_type"):
        msg_data["chat_type"] = "task"
    msg = ChatMessage(task_id=task_id, sender_id=user.id, **msg_data)
    db.add(msg)

    # Determine recipient
    recipient_id = task.assigned_by if str(task.assigned_to) == str(user.id) else task.assigned_to
    if recipient_id and str(recipient_id) != str(user.id):
        preview_text = (msg.message[:80] + '...') if msg.message and len(msg.message) > 80 else (msg.message or 'Sent an attachment')
        notif = Notification(
            user_id=recipient_id,
            title=f"Chat: {task.title}",
            message=f"{user.first_name} {user.last_name}: {preview_text}",
            event_type="chat.message",
            ref_id=str(task.id)
        )
        db.add(notif)

    db.commit()
    db.refresh(msg)
    event = {
        "type": CHAT_NEW_MESSAGE,
        "data": {
            "id": str(msg.id),
            "task_id": str(task_id),
            "sender_id": str(user.id),
            "sender_name": f"{user.first_name} {user.last_name}".strip(),
            "message": msg.message,
            "attachment_url": msg.attachment_url,
            "attachment_type": msg.attachment_type,
            "storage_provider": msg.storage_provider,
            "chat_type": "task",
            "created_at": (msg.created_at.isoformat() + "Z") if msg.created_at and not msg.created_at.isoformat().endswith("Z") and "+" not in msg.created_at.isoformat() else (msg.created_at.isoformat() if msg.created_at else None),
            "sender": {
                "id": str(user.id),
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
                "avatar_url": user.avatar_url
            }
        }
    }
    # Direct targeted WebSocket dispatch ONLY to sender and recipient (private)
    if recipient_id and str(recipient_id) != str(user.id):
        await manager.send_to_user(str(recipient_id), event)
        await manager.send_to_user(str(recipient_id), {
            "type": "notification.new",
            "data": {
                "title": f"Chat: {task.title}",
                "message": f"{user.first_name} {user.last_name}: {msg.message or 'Sent an attachment'}",
                "ref_id": str(task.id),
                "task_id": str(task.id),
                "event_type": "chat.message"
            }
        })
    await manager.send_to_user(str(user.id), event)
    return msg


# ==========================================
# Collaboration: Direct Messages
# ==========================================

@router.get("/api/chat/direct/{other_user_id}", response_model=List[ChatMessageResponse])
def get_direct_chat(other_user_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    other = db.query(User).filter(User.id == other_user_id).first()
    if not other:
        raise HTTPException(404, "User not found")
    messages = db.query(ChatMessage).filter(
        or_(
            and_(ChatMessage.sender_id == user.id, ChatMessage.receiver_id == other_user_id),
            and_(ChatMessage.sender_id == other_user_id, ChatMessage.receiver_id == user.id)
        )
    ).order_by(ChatMessage.created_at.asc()).all()
    return messages


@router.post("/api/chat/direct/{other_user_id}", response_model=ChatMessageResponse)
async def send_direct_message(other_user_id: UUID, req: ChatMessageCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    other = db.query(User).filter(User.id == other_user_id).first()
    if not other:
        raise HTTPException(404, "Recipient user not found")

    msg = ChatMessage(
        sender_id=user.id,
        receiver_id=other_user_id,
        chat_type="direct",
        message=req.message,
        attachment_url=req.attachment_url,
        attachment_type=req.attachment_type,
        storage_provider=req.storage_provider
    )
    db.add(msg)

    # Notification for recipient
    if str(other_user_id) != str(user.id):
        preview_text = (msg.message[:80] + '...') if msg.message and len(msg.message) > 80 else (msg.message or 'Sent an attachment')
        notif = Notification(
            user_id=other_user_id,
            title=f"Message from {user.first_name} {user.last_name}",
            message=preview_text,
            event_type="chat.direct",
            ref_id=str(user.id)
        )
        db.add(notif)

    db.commit()
    db.refresh(msg)

    event = {
        "type": CHAT_NEW_MESSAGE,
        "data": {
            "id": str(msg.id),
            "sender_id": str(user.id),
            "receiver_id": str(other_user_id),
            "sender_name": f"{user.first_name} {user.last_name}".strip(),
            "message": msg.message,
            "attachment_url": msg.attachment_url,
            "attachment_type": msg.attachment_type,
            "storage_provider": msg.storage_provider,
            "chat_type": "direct",
            "created_at": (msg.created_at.isoformat() + "Z") if msg.created_at and not msg.created_at.isoformat().endswith("Z") and "+" not in msg.created_at.isoformat() else (msg.created_at.isoformat() if msg.created_at else None),
            "sender": {
                "id": str(user.id),
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
                "avatar_url": user.avatar_url
            }
        }
    }

    if str(other_user_id) != str(user.id):
        await manager.send_to_user(str(other_user_id), event)
        await manager.send_to_user(str(other_user_id), {
            "type": "notification.new",
            "data": {
                "title": f"Message from {user.first_name} {user.last_name}",
                "message": msg.message or "Sent an attachment",
                "ref_id": str(user.id),
                "event_type": "chat.direct"
            }
        })
    await manager.send_to_user(str(user.id), event)
    return msg


# ==========================================
# Collaboration: Team Channels
# ==========================================

@router.get("/api/chat/channel/{channel_name}", response_model=List[ChatMessageResponse])
def get_channel_chat(channel_name: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    chat_type_tag = f"channel:{channel_name}"
    messages = db.query(ChatMessage).filter(
        or_(
            ChatMessage.chat_type == chat_type_tag,
            ChatMessage.chat_type == channel_name
        )
    ).order_by(ChatMessage.created_at.asc()).all()
    return messages


@router.post("/api/chat/channel/{channel_name}", response_model=ChatMessageResponse)
async def send_channel_message(channel_name: str, req: ChatMessageCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    chat_type_tag = f"channel:{channel_name}"
    msg = ChatMessage(
        sender_id=user.id,
        chat_type=chat_type_tag,
        message=req.message,
        attachment_url=req.attachment_url,
        attachment_type=req.attachment_type,
        storage_provider=req.storage_provider
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    event = {
        "type": CHAT_NEW_MESSAGE,
        "data": {
            "id": str(msg.id),
            "sender_id": str(user.id),
            "sender_name": f"{user.first_name} {user.last_name}".strip(),
            "message": msg.message,
            "attachment_url": msg.attachment_url,
            "attachment_type": msg.attachment_type,
            "storage_provider": msg.storage_provider,
            "chat_type": chat_type_tag,
            "channel_name": channel_name,
            "created_at": (msg.created_at.isoformat() + "Z") if msg.created_at and not msg.created_at.isoformat().endswith("Z") and "+" not in msg.created_at.isoformat() else (msg.created_at.isoformat() if msg.created_at else None),
            "sender": {
                "id": str(user.id),
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
                "avatar_url": user.avatar_url
            }
        }
    }
    await manager.broadcast("global:all", event)
    return msg


# ==========================================
# Collaboration: Project Discussions
# ==========================================

@router.get("/api/chat/project/{project_id}", response_model=List[ChatMessageResponse])
def get_project_chat(project_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(404, "Project not found")
    messages = db.query(ChatMessage).filter(
        ChatMessage.project_id == project_id
    ).order_by(ChatMessage.created_at.asc()).all()
    return messages


@router.post("/api/chat/project/{project_id}", response_model=ChatMessageResponse)
async def send_project_message(project_id: UUID, req: ChatMessageCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(404, "Project not found")
    msg = ChatMessage(
        sender_id=user.id,
        project_id=project_id,
        chat_type="project",
        message=req.message,
        attachment_url=req.attachment_url,
        attachment_type=req.attachment_type,
        storage_provider=req.storage_provider
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    event = {
        "type": CHAT_NEW_MESSAGE,
        "data": {
            "id": str(msg.id),
            "sender_id": str(user.id),
            "project_id": str(project_id),
            "sender_name": f"{user.first_name} {user.last_name}".strip(),
            "message": msg.message,
            "attachment_url": msg.attachment_url,
            "attachment_type": msg.attachment_type,
            "storage_provider": msg.storage_provider,
            "chat_type": "project",
            "created_at": (msg.created_at.isoformat() + "Z") if msg.created_at and not msg.created_at.isoformat().endswith("Z") and "+" not in msg.created_at.isoformat() else (msg.created_at.isoformat() if msg.created_at else None),
            "sender": {
                "id": str(user.id),
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
                "avatar_url": user.avatar_url
            }
        }
    }
    await manager.broadcast(f"project:{project_id}", event)
    await manager.broadcast("global:all", event)
    return msg
