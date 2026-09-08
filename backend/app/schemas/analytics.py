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


class TimelineDataPoint(BaseModel):
    label: str
    completed: int
    created: int
    in_progress: int


class DepartmentAnalytics(BaseModel):
    department: str
    total_tasks: int
    completed: int
    in_progress: int
    completion_rate: float


class StatusDistribution(BaseModel):
    status: str
    label: str
    count: int
    percentage: float
    color: str


class AnalyticsResponse(BaseModel):
    period: str  # daily, weekly, monthly
    kpi: KPIData
    members: Optional[List[UserAnalytics]] = None
    timeline: Optional[List[TimelineDataPoint]] = None
    departments: Optional[List[DepartmentAnalytics]] = None
    status_distribution: Optional[List[StatusDistribution]] = None

