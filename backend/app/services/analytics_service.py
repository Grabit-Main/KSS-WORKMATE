from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.task import Task
from app.models.user import User
from app.schemas.analytics import KPIData, UserAnalytics, AnalyticsResponse


def _task_kpi(tasks: list) -> KPIData:
    total = len(tasks)
    completed = sum(1 for t in tasks if t.status == "completed")
    in_progress = sum(1 for t in tasks if t.status == "in_progress")
    in_review = sum(1 for t in tasks if t.status == "in_review")
    not_started = sum(1 for t in tasks if t.status == "not_started")
    blocked = sum(1 for t in tasks if t.status == "blocked")
    exceeded = sum(1 for t in tasks if t.deadline_exceeded)
    rate = round((completed / total * 100), 1) if total else 0.0

    # Avg completion hours from status logs would need joins; ponytail: skip for now
    return KPIData(
        total_tasks=total,
        completed=completed,
        in_progress=in_progress,
        in_review=in_review,
        not_started=not_started,
        blocked=blocked,
        deadline_exceeded=exceeded,
        completion_rate=rate,
        avg_completion_hours=None,
    )


def get_team_analytics(db: Session, team_id: str, period: str) -> AnalyticsResponse:
    since = _since(period)
    tasks = db.query(Task).filter(Task.team_id == team_id, Task.created_at >= since).all()
    return AnalyticsResponse(period=period, kpi=_task_kpi(tasks))


def get_user_analytics(db: Session, user_id: str, period: str) -> AnalyticsResponse:
    since = _since(period)
    tasks = db.query(Task).filter(Task.assigned_to == user_id, Task.created_at >= since).all()
    return AnalyticsResponse(period=period, kpi=_task_kpi(tasks))


def get_organization_analytics(db: Session, period: str) -> AnalyticsResponse:
    since = _since(period)
    tasks = db.query(Task).filter(Task.created_at >= since).all()
    overall_kpi = _task_kpi(tasks)

    # Per-member performance breakdown
    users = db.query(User).filter(User.is_active == True).all()
    members_analytics = []
    for u in users:
        # Include all operational members (TM, TL, PM, etc.) who have tasks or are active developers
        if u.role in ("TM", "TL", "PM"):
            u_tasks = [t for t in tasks if str(t.assigned_to) == str(u.id)]
            members_analytics.append(
                UserAnalytics(
                    user_id=str(u.id),
                    user_name=f"{u.first_name} {u.last_name}",
                    role=u.role,
                    kpi=_task_kpi(u_tasks),
                )
            )

    return AnalyticsResponse(period=period, kpi=overall_kpi, members=members_analytics)


def _since(period: str) -> datetime:
    now = datetime.utcnow()
    if period == "daily":
        return now - timedelta(days=1)
    if period == "weekly":
        return now - timedelta(weeks=1)
    return now - timedelta(days=30)  # monthly
