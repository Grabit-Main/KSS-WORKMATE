from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app.models.chat import ChatMessage
from app.models.task import Task
from app.models.project import TeamMembership
from app.models.user import User
from app.schemas.chat import ChatMessageCreate, ChatMessageResponse
from app.dependencies import get_current_user
from app.websocket.manager import manager
from app.websocket.events import CHAT_NEW_MESSAGE

router = APIRouter(prefix="/api/tasks", tags=["chat"])


def _can_chat(db, task, user):
    """TL of team or assigned TM can chat."""
    if str(task.assigned_to) == str(user.id):
        return True
    lead = db.query(TeamMembership).filter(
        TeamMembership.team_id == task.team_id,
        TeamMembership.user_id == user.id,
        TeamMembership.is_lead == True,
    ).first()
    return bool(lead) or user.role in ("CEO", "CTO", "PM")


@router.get("/{task_id}/chat", response_model=List[ChatMessageResponse])
def get_chat(task_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task or not _can_chat(db, task, user):
        raise HTTPException(403, "Access denied")
    return db.query(ChatMessage).filter(ChatMessage.task_id == task_id).order_by(ChatMessage.created_at.asc()).all()


@router.post("/{task_id}/chat", response_model=ChatMessageResponse)
async def send_message(task_id: UUID, req: ChatMessageCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task or not _can_chat(db, task, user):
        raise HTTPException(403, "Access denied")
    msg = ChatMessage(task_id=task_id, sender_id=user.id, **req.model_dump())
    db.add(msg)
    db.commit()
    db.refresh(msg)
    event = {
        "type": CHAT_NEW_MESSAGE,
        "data": {
            "id": str(msg.id),
            "task_id": str(task_id),
            "sender_id": str(user.id),
            "sender_name": f"{user.first_name} {user.last_name}",
            "message": msg.message,
            "attachment_url": msg.attachment_url,
            "created_at": msg.created_at.isoformat(),
        }
    }
    await manager.broadcast(f"task:{task_id}", event)
    return msg
