import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Date, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class DailyKPILog(Base):
    __tablename__ = "daily_kpi_logs"
    __table_args__ = (
        UniqueConstraint("employee_id", "date", name="uq_employee_date_kpi"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    date = Column(Date, nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    evaluator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # 10 Criteria scores (1 to 5)
    task_completion = Column(Integer, nullable=False)       # Weight: 3 (15%)
    quality = Column(Integer, nullable=False)               # Weight: 3 (15%)
    productivity = Column(Integer, nullable=False)          # Weight: 3 (15%)
    deadline_adherence = Column(Integer, nullable=False)    # Weight: 2 (10%)
    ownership = Column(Integer, nullable=False)             # Weight: 2 (10%)
    problem_solving = Column(Integer, nullable=False)       # Weight: 2 (10%)
    communication = Column(Integer, nullable=False)         # Weight: 2 (10%)
    team_collaboration = Column(Integer, nullable=False)    # Weight: 1 (5%)
    learning_improvement = Column(Integer, nullable=False)  # Weight: 1 (5%)
    attendance_discipline = Column(Integer, nullable=False) # Weight: 1 (5%)

    daily_kpi_percentage = Column(Float, nullable=False)    # 20.0% to 100.0%
    month = Column(String(20), nullable=False)             # e.g. 'Sep-26'
    status = Column(String(50), nullable=False)            # e.g. 'Excellent', 'Very Good'
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    employee = relationship("User", foreign_keys=[employee_id])
    evaluator = relationship("User", foreign_keys=[evaluator_id])

    @staticmethod
    def calculate_metrics(
        task_completion: int,
        quality: int,
        productivity: int,
        deadline_adherence: int,
        ownership: int,
        problem_solving: int,
        communication: int,
        team_collaboration: int,
        learning_improvement: int,
        attendance_discipline: int,
        log_date
    ):
        """
        Computes the daily KPI percentage, month string, and performance status
        based on the exact weighted sum of the 10 criteria scores.
        """
        # Weighted sum: Max = (3*5 + 3*5 + 3*5 + 2*5 + 2*5 + 2*5 + 2*5 + 1*5 + 1*5 + 1*5) = 100
        score = (
            3 * task_completion
            + 3 * quality
            + 3 * productivity
            + 2 * deadline_adherence
            + 2 * ownership
            + 2 * problem_solving
            + 2 * communication
            + 1 * team_collaboration
            + 1 * learning_improvement
            + 1 * attendance_discipline
        )
        pct = round(float(score), 1)

        # Status thresholds matching Employee_KPI_Tracker-01.csv
        if pct >= 90.0:
            status = "Excellent"
        elif pct >= 80.0:
            status = "Very Good"
        elif pct >= 70.0:
            status = "Meets Expectation"
        elif pct >= 60.0:
            status = "Needs Improvement"
        else:
            status = "Needs Attention"

        # Month string: e.g. 'Sep-26'
        month_str = log_date.strftime("%b-%y")

        return pct, month_str, status
