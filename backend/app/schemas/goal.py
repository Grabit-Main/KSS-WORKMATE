from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID


class GoalCreate(BaseModel):
    title: str
    category: Optional[str] = "Technical Skills"
    type: Optional[str] = "Technical"
    priority: Optional[str] = "Medium"
    start_date: Optional[str] = None
    target_date: Optional[str] = None
    duration: Optional[str] = None
    progress: Optional[int] = 0
    milestones_completed: Optional[int] = 0
    milestones_total: Optional[int] = 0
    update_frequency: Optional[str] = "Daily"
    status: Optional[str] = "In Progress"
    time_spent: Optional[str] = "0 hrs"
    icon_type: Optional[str] = "react"
    description: Optional[str] = None
    target_outcome: Optional[str] = None
    next_steps: Optional[str] = None
    challenges: Optional[str] = None
    activities: Optional[str] = None
    resources: Optional[List[Any]] = []
    milestones: Optional[List[Any]] = []
    progress_history: Optional[List[Any]] = []


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    type: Optional[str] = None
    priority: Optional[str] = None
    start_date: Optional[str] = None
    target_date: Optional[str] = None
    duration: Optional[str] = None
    progress: Optional[int] = None
    milestones_completed: Optional[int] = None
    milestones_total: Optional[int] = None
    update_frequency: Optional[str] = None
    status: Optional[str] = None
    time_spent: Optional[str] = None
    icon_type: Optional[str] = None
    description: Optional[str] = None
    target_outcome: Optional[str] = None
    next_steps: Optional[str] = None
    challenges: Optional[str] = None
    activities: Optional[str] = None
    resources: Optional[List[Any]] = None
    milestones: Optional[List[Any]] = None
    progress_history: Optional[List[Any]] = None


class GoalResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    category: Optional[str] = "Technical Skills"
    type: Optional[str] = "Technical"
    priority: Optional[str] = "Medium"
    start_date: Optional[str] = None
    target_date: Optional[str] = None
    duration: Optional[str] = None
    progress: int = 0
    milestones_completed: int = 0
    milestones_total: int = 0
    update_frequency: Optional[str] = "Daily"
    status: str = "In Progress"
    time_spent: str = "0 hrs"
    icon_type: Optional[str] = "react"
    description: Optional[str] = None
    target_outcome: Optional[str] = None
    next_steps: Optional[str] = None
    challenges: Optional[str] = None
    activities: Optional[str] = None
    resources: Optional[List[Any]] = []
    milestones: Optional[List[Any]] = []
    progress_history: Optional[List[Any]] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

