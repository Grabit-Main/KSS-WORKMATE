from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.database import get_db, Base, engine
from app.models.user import User
from app.models.goal import Goal
from app.schemas.goal import GoalCreate, GoalUpdate, GoalResponse
from app.dependencies import get_current_user
from app.websocket.manager import manager
from app.websocket.events import ANALYTICS_REFRESH

# Ensure database tables exist automatically
Base.metadata.create_all(bind=engine)

router = APIRouter(prefix="/api/goals", tags=["goals"])


def _parse_uuid(val: Optional[str]) -> Optional[UUID]:
    if not val:
        return None
    val_str = str(val).strip().lower()
    if val_str in ("undefined", "null", "", "all", "none"):
        return None
    try:
        return UUID(str(val).strip())
    except (ValueError, TypeError):
        return None


@router.get("", response_model=List[GoalResponse])
def get_goals(
    user_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    parsed_user_id = _parse_uuid(user_id)
    
    # If user_id specified and requester has permissions, show that user's goals; otherwise default to logged in user
    if parsed_user_id:
        if user.role not in ("CEO", "CTO", "PM", "TL") and str(user.id) != str(parsed_user_id):
            raise HTTPException(status_code=403, detail="Not authorized to view another user's goals")
        q = db.query(Goal).filter(Goal.user_id == parsed_user_id)
    else:
        q = db.query(Goal).filter(Goal.user_id == user.id)

    if status and status.lower() != "all":
        q = q.filter(Goal.status == status)

    if category and category.lower() != "all":
        q = q.filter(Goal.category.ilike(f"%{category}%"))

    return q.order_by(Goal.created_at.desc()).all()


@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    payload: GoalCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    goal_data = payload.model_dump()
    new_goal = Goal(
        user_id=user.id,
        **goal_data
    )
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)

    try:
        await manager.broadcast({"event": ANALYTICS_REFRESH, "type": "goal_created", "user_id": str(user.id)})
    except Exception:
        pass

    return new_goal


@router.get("/{goal_id}", response_model=GoalResponse)
def get_goal_by_id(
    goal_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    if user.role not in ("CEO", "CTO", "PM", "TL") and str(goal.user_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Not authorized to view this goal")

    return goal


@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: UUID,
    payload: GoalUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    if user.role not in ("CEO", "CTO", "PM", "TL") and str(goal.user_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Not authorized to modify this goal")

    update_dict = payload.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(goal, field, value)

    goal.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(goal)

    try:
        await manager.broadcast({"event": ANALYTICS_REFRESH, "type": "goal_updated", "user_id": str(user.id)})
    except Exception:
        pass

    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    if user.role not in ("CEO", "CTO", "PM", "TL") and str(goal.user_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this goal")

    db.delete(goal)
    db.commit()

    try:
        await manager.broadcast({"event": ANALYTICS_REFRESH, "type": "goal_deleted", "user_id": str(user.id)})
    except Exception:
        pass

    return None

