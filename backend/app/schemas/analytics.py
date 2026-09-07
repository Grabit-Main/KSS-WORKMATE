from typing import Optional, List
from pydantic import BaseModel


class KPIData(BaseModel):
    total_tasks: int
    completed: int
    in_progress: int
    in_review: int
    not_started: int
    blocked: int
    deadline_exceeded: int
    completion_rate: float
    avg_completion_hours: Optional[float]


class UserAnalytics(BaseModel):
    user_id: str
    user_name: str
    role: str
    kpi: KPIData


class AnalyticsResponse(BaseModel):
    period: str  # daily, weekly, monthly
    kpi: KPIData
    members: Optional[List[UserAnalytics]] = None
