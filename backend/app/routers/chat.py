from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.database import get_db
from app.models.chat import ChatMessage, ChatMessageRead
from app.models.task import Task
from app.models.project import Project, TeamMembership
from app.models.user import User
from app.models.notification import Notification
from app.schemas.chat import ChatMessageCreate, ChatMessageResponse, MarkReadRequest, UnreadCountsResponse
from app.dependencies import get_current_user
from app.websocket.manager import manager
from app.websocket.events import CHAT_NEW_MESSAGE, CHAT_MESSAGES_READ, CHAT_MESSAGE_DELETED

router = APIRouter(tags=["chat"])


def _can_chat(db, task, user):
    """Only assigned member and assigner can access task chat."""
    if str(task.assigned_to) == str(user.id) or str(task.assigned_by) == str(user.id):
        return True
    return False


def _enrich_messages_with_read(messages: List[ChatMessage], current_user_id: UUID, db: Session):
    if not messages:
        return messages

    msg_ids = [m.id for m in messages]
    reads = db.query(ChatMessageRead).filter(ChatMessageRead.message_id.in_(msg_ids)).all()

    read_users_map = {}
    read_at_map = {}
    for r in reads:
        s_mid = str(r.message_id)
        s_uid = str(r.user_id)
        if s_mid not in read_users_map:
            read_users_map[s_mid] = set()
        read_users_map[s_mid].add(s_uid)
        read_at_map[s_mid] = r.read_at

    current_uid_str = str(current_user_id)

    for m in messages:
        s_mid = str(m.id)
        readers = read_users_map.get(s_mid, set())

        if str(m.sender_id) == current_uid_str:
            # Outgoing message
            if m.receiver_id:
                m.is_read = str(m.receiver_id) in readers
            else:
                other_readers = [uid for uid in readers if uid != current_uid_str]
                m.is_read = len(other_readers) > 0
        else:
            # Incoming message
            m.is_read = current_uid_str in readers

        m.read_at = read_at_map.get(s_mid)

    return messages


# ==========================================
# Task Chat (Existing Endpoints)
# ==========================================

@router.get("/api/tasks/{task_id}/chat", response_model=List[ChatMessageResponse])
def get_chat(task_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task or not _can_chat(db, task, user):
        raise HTTPException(403, "Access denied: This conversation is private between the assignee and assigner.")
    messages = db.query(ChatMessage).filter(ChatMessage.task_id == task_id).order_by(ChatMessage.created_at.asc()).all()
    return _enrich_messages_with_read(messages, user.id, db)


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
            "is_read": False,
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
    return _enrich_messages_with_read(messages, user.id, db)


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
            "is_read": False,
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
    return _enrich_messages_with_read(messages, user.id, db)


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
            "is_read": False,
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
    return _enrich_messages_with_read(messages, user.id, db)


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
            "is_read": False,
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


# ==========================================
# Collaboration: Read & Unread Tracking
# ==========================================

@router.get("/api/chat/unread-counts", response_model=UnreadCountsResponse)
def get_unread_counts(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    read_subquery = db.query(ChatMessageRead.message_id).filter(ChatMessageRead.user_id == user.id)

    counts = {}

    # 1. Unread direct messages sent to current_user
    unread_direct = db.query(ChatMessage.sender_id, func.count(ChatMessage.id)).filter(
        ChatMessage.receiver_id == user.id,
        ~ChatMessage.id.in_(read_subquery)
    ).group_by(ChatMessage.sender_id).all()

    for sender_id, count in unread_direct:
        counts[str(sender_id)] = count

    # 2. Unread channel messages
    unread_channels = db.query(ChatMessage.chat_type, func.count(ChatMessage.id)).filter(
        or_(
            ChatMessage.chat_type.like("channel:%"),
            ChatMessage.chat_type.in_(["general", "engineering", "sprint"])
        ),
        ChatMessage.sender_id != user.id,
        ~ChatMessage.id.in_(read_subquery)
    ).group_by(ChatMessage.chat_type).all()

    for chat_type, count in unread_channels:
        c_name = chat_type.replace("channel:", "") if chat_type else ""
        if c_name:
            counts[c_name] = counts.get(c_name, 0) + count

    # 3. Unread project messages
    unread_projects = db.query(ChatMessage.project_id, func.count(ChatMessage.id)).filter(
        ChatMessage.project_id.isnot(None),
        ChatMessage.sender_id != user.id,
        ~ChatMessage.id.in_(read_subquery)
    ).group_by(ChatMessage.project_id).all()
    for proj_id, count in unread_projects:
        if proj_id:
            counts[str(proj_id)] = counts.get(str(proj_id), 0) + count

    # 4. Unread task messages
    unread_tasks = db.query(ChatMessage.task_id, func.count(ChatMessage.id)).filter(
        ChatMessage.task_id.isnot(None),
        ChatMessage.sender_id != user.id,
        ~ChatMessage.id.in_(read_subquery)
    ).group_by(ChatMessage.task_id).all()
    for t_id, count in unread_tasks:
        if t_id:
            counts[str(t_id)] = counts.get(str(t_id), 0) + count

    total = sum(counts.values())
    return UnreadCountsResponse(counts=counts, total=total)


@router.post("/api/chat/read")
async def mark_chat_read(req: MarkReadRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    read_subquery = db.query(ChatMessageRead.message_id).filter(ChatMessageRead.user_id == user.id)

    query = db.query(ChatMessage).filter(~ChatMessage.id.in_(read_subquery))

    clean_target = str(req.target_id).replace("channel:", "")

    if req.chat_type == "direct":
        try:
            other_uid = UUID(str(req.target_id))
            query = query.filter(
                ChatMessage.sender_id == other_uid,
                ChatMessage.receiver_id == user.id
            )
        except ValueError:
            return {"status": "ok", "read_count": 0, "message_ids": []}

    elif req.chat_type == "channel":
        query = query.filter(
            or_(
                ChatMessage.chat_type == f"channel:{clean_target}",
                ChatMessage.chat_type == clean_target
            ),
            ChatMessage.sender_id != user.id
        )

    elif req.chat_type == "task":
        try:
            task_uuid = UUID(str(req.target_id))
            query = query.filter(
                ChatMessage.task_id == task_uuid,
                ChatMessage.sender_id != user.id
            )
        except ValueError:
            return {"status": "ok", "read_count": 0, "message_ids": []}

    elif req.chat_type == "project":
        try:
            proj_uuid = UUID(str(req.target_id))
            query = query.filter(
                ChatMessage.project_id == proj_uuid,
                ChatMessage.sender_id != user.id
            )
        except ValueError:
            return {"status": "ok", "read_count": 0, "message_ids": []}

    if req.message_ids:
        query = query.filter(ChatMessage.id.in_(req.message_ids))

    unread_messages = query.all()
    now = datetime.utcnow()

    # Also sync notifications table
    db.query(Notification).filter(
        Notification.user_id == user.id,
        or_(
            Notification.ref_id == str(req.target_id),
            Notification.ref_id == str(clean_target)
        ),
        Notification.is_read == False
    ).update({"is_read": True}, synchronize_session=False)

    read_msg_ids = []
    if unread_messages:
        new_reads = [
            ChatMessageRead(message_id=m.id, user_id=user.id, read_at=now)
            for m in unread_messages
        ]
        db.add_all(new_reads)
        read_msg_ids = [str(m.id) for m in unread_messages]

    db.commit()

    # Broadcast real-time read event
    read_event = {
        "type": CHAT_MESSAGES_READ,
        "data": {
            "chat_type": req.chat_type,
            "target_id": str(clean_target),
            "original_target_id": str(req.target_id),
            "reader_id": str(user.id),
            "read_message_ids": read_msg_ids,
            "read_at": now.isoformat() + "Z"
        }
    }
    await manager.broadcast("global:all", read_event)
    if req.chat_type == "direct":
        await manager.send_to_user(str(req.target_id), read_event)
    await manager.send_to_user(str(user.id), read_event)

    return {
        "status": "ok",
        "read_count": len(unread_messages),
        "message_ids": read_msg_ids
    }


# ==========================================
# Collaboration: Delete Message
# ==========================================

@router.delete("/api/chat/messages/{message_id}")
async def delete_chat_message(message_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    msg = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not msg:
        raise HTTPException(404, "Message not found")
    if str(msg.sender_id) != str(user.id) and user.role not in ("CEO", "CTO", "PM"):
        raise HTTPException(403, "You do not have permission to delete this message")
    db.delete(msg)
    db.commit()

    delete_event = {
        "type": "chat.message_deleted",
        "data": {
            "id": str(message_id),
            "task_id": str(msg.task_id) if msg.task_id else None,
            "project_id": str(msg.project_id) if msg.project_id else None,
            "chat_type": msg.chat_type,
            "sender_id": str(msg.sender_id)
        }
    }
    await manager.broadcast("global:all", delete_event)
    return {"status": "ok", "deleted_id": str(message_id)}

