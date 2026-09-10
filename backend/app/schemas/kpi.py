from pydantic import BaseModel, Field
from typing import Optional, Dict
from uuid import UUID
from datetime import date, datetime


class KPIUserSummary(BaseModel):
    id: UUID
    email: str
    first_name: str
    last_name: str
    role: str
    department: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class KPICreate(BaseModel):
    employee_id: UUID
    date: date
    task_completion: int = Field(..., ge=1, le=5, description="1 to 5, Weight: 3")
    quality: int = Field(..., ge=1, le=5, description="1 to 5, Weight: 3")
    productivity: int = Field(..., ge=1, le=5, description="1 to 5, Weight: 3")
    deadline_adherence: int = Field(..., ge=1, le=5, description="1 to 5, Weight: 2")
    ownership: int = Field(..., ge=1, le=5, description="1 to 5, Weight: 2")
    problem_solving: int = Field(..., ge=1, le=5, description="1 to 5, Weight: 2")
    communication: int = Field(..., ge=1, le=5, description="1 to 5, Weight: 2")
    team_collaboration: int = Field(..., ge=1, le=5, description="1 to 5, Weight: 1")
    learning_improvement: int = Field(..., ge=1, le=5, description="1 to 5, Weight: 1")
    attendance_discipline: int = Field(..., ge=1, le=5, description="1 to 5, Weight: 1")
    notes: Optional[str] = None


class KPIUpdate(BaseModel):
    task_completion: Optional[int] = Field(None, ge=1, le=5)
    quality: Optional[int] = Field(None, ge=1, le=5)
    productivity: Optional[int] = Field(None, ge=1, le=5)
    deadline_adherence: Optional[int] = Field(None, ge=1, le=5)
    ownership: Optional[int] = Field(None, ge=1, le=5)
    problem_solving: Optional[int] = Field(None, ge=1, le=5)
    communication: Optional[int] = Field(None, ge=1, le=5)
    team_collaboration: Optional[int] = Field(None, ge=1, le=5)
    learning_improvement: Optional[int] = Field(None, ge=1, le=5)
    attendance_discipline: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None


class KPIResponse(BaseModel):
    id: UUID
    date: date
    employee_id: UUID
    evaluator_id: UUID
    employee: Optional[KPIUserSummary] = None
    evaluator: Optional[KPIUserSummary] = None
    task_completion: int
    quality: int
    productivity: int
    deadline_adherence: int
    ownership: int
    problem_solving: int
    communication: int
    team_collaboration: int
    learning_improvement: int
    attendance_discipline: int
    daily_kpi_percentage: float
    month: str
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class KPISummary(BaseModel):
    total_logs: int
    average_kpi: float
    status_counts: Dict[str, int]
