from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from typing import List
from app.models.task import Task
from app.models.user import User
from app.models.project import Project, Team, TeamMembership
from app.schemas.analytics import (
    KPIData, UserAnalytics, AnalyticsResponse,
    TimelineDataPoint, DepartmentAnalytics, StatusDistribution
)


DEPARTMENTS_LIST = [
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "UI/UX Designer",
    "DevOPS Engineer",
    "QA Tester",
]

STATUS_SPECS = [
    {"status": "completed", "label": "Completed", "color": "#10B981"},
    {"status": "in_progress", "label": "In Progress", "color": "#F59E0B"},
    {"status": "in_review", "label": "In Review", "color": "#6366F1"},
    {"status": "blocked", "label": "Blocked", "color": "#EF4444"},
    {"status": "not_started", "label": "Not Started", "color": "#94A3B8"},
]


def _task_kpi(tasks: list) -> KPIData:
    total = len(tasks)
    completed = sum(1 for t in tasks if t.status == "completed")
    in_progress = sum(1 for t in tasks if t.status == "in_progress")
    in_review = sum(1 for t in tasks if t.status == "in_review")
    not_started = sum(1 for t in tasks if t.status == "not_started")
    blocked = sum(1 for t in tasks if t.status == "blocked")
    exceeded = sum(1 for t in tasks if t.deadline_exceeded)
    rate = round((completed / total * 100), 1) if total else 0.0

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


def _status_distribution(tasks: list) -> List[StatusDistribution]:
    total = len(tasks)
    dist = []
    for spec in STATUS_SPECS:
        count = sum(1 for t in tasks if t.status == spec["status"])
        pct = round((count / total * 100), 1) if total else 0.0
        dist.append(
            StatusDistribution(
                status=spec["status"],
                label=spec["label"],
                count=count,
                percentage=pct,
                color=spec["color"]
            )
        )
    return dist


def _timeline(tasks: list, period: str) -> List[TimelineDataPoint]:
    now = datetime.utcnow()
    points = []

    if period == "daily":
        # 4 slices of 6 hours
        for i in range(4):
            start = now - timedelta(hours=(4 - i) * 6)
            end = start + timedelta(hours=6)
            label = start.strftime("%H:%M")
            slice_tasks = [t for t in tasks if t.created_at and start <= t.created_at < end]
            comp = sum(1 for t in slice_tasks if t.status == "completed")
            prog = sum(1 for t in slice_tasks if t.status == "in_progress")
            points.append(
                TimelineDataPoint(
                    label=label,
                    completed=comp,
                    created=len(slice_tasks),
                    in_progress=prog
                )
            )
    elif period == "weekly":
        # 7 days
        for i in range(7):
            d = now - timedelta(days=(6 - i))
            start = datetime(d.year, d.month, d.day)
            end = start + timedelta(days=1)
            label = start.strftime("%a")
            slice_tasks = [t for t in tasks if t.created_at and start <= t.created_at < end]
            comp = sum(1 for t in slice_tasks if t.status == "completed")
            prog = sum(1 for t in slice_tasks if t.status == "in_progress")
            points.append(
                TimelineDataPoint(
                    label=label,
                    completed=comp,
                    created=len(slice_tasks),
                    in_progress=prog
                )
            )
    else:  # monthly
        # 4 weeks
        for i in range(4):
            start = now - timedelta(days=(4 - i) * 7)
            end = start + timedelta(days=7)
            label = f"Week {i + 1}"
            slice_tasks = [t for t in tasks if t.created_at and start <= t.created_at < end]
            comp = sum(1 for t in slice_tasks if t.status == "completed")
            prog = sum(1 for t in slice_tasks if t.status == "in_progress")
            points.append(
                TimelineDataPoint(
                    label=label,
                    completed=comp,
                    created=len(slice_tasks),
                    in_progress=prog
                )
            )

    return points


def _department_analytics(tasks: list, db: Session) -> List[DepartmentAnalytics]:
    # Map user id to department
    users = db.query(User.id, User.department).filter(User.is_active == True).all()
    user_dept_map = {str(u[0]): (u[1] or "General") for u in users}

    dept_stats = {}
    for d in DEPARTMENTS_LIST:
        dept_stats[d] = {"total": 0, "completed": 0, "in_progress": 0}

    for t in tasks:
        d_name = user_dept_map.get(str(t.assigned_to), "Other")
        if d_name not in dept_stats:
            dept_stats[d_name] = {"total": 0, "completed": 0, "in_progress": 0}
        dept_stats[d_name]["total"] += 1
        if t.status == "completed":
            dept_stats[d_name]["completed"] += 1
        elif t.status == "in_progress":
            dept_stats[d_name]["in_progress"] += 1

    result = []
    # Include the predefined departments first, then any extra
    for dept_name, s in dept_stats.items():
        total = s["total"]
        comp = s["completed"]
        rate = round((comp / total * 100), 1) if total else 0.0
        result.append(
            DepartmentAnalytics(
                department=dept_name,
                total_tasks=total,
                completed=comp,
                in_progress=s["in_progress"],
                completion_rate=rate
            )
        )
    return result


def get_team_analytics(db: Session, team_id: str, period: str) -> AnalyticsResponse:
    since = _since(period)
    tasks = db.query(Task).filter(Task.team_id == team_id, Task.created_at >= since).all()
    return AnalyticsResponse(
        period=period,
        kpi=_task_kpi(tasks),
        status_distribution=_status_distribution(tasks),
        timeline=_timeline(tasks, period),
        departments=_department_analytics(tasks, db)
    )


def get_user_analytics(db: Session, user_id: str, period: str) -> AnalyticsResponse:
    since = _since(period)
    tasks = db.query(Task).filter(Task.assigned_to == user_id, Task.created_at >= since).all()
    return AnalyticsResponse(
        period=period,
        kpi=_task_kpi(tasks),
        status_distribution=_status_distribution(tasks),
        timeline=_timeline(tasks, period),
        departments=_department_analytics(tasks, db)
    )


def get_pm_analytics(db: Session, pm_user_id: str, period: str) -> AnalyticsResponse:
    since = _since(period)
    # Tasks across company projects and teams
    tasks = db.query(Task).filter(Task.created_at >= since).all()
    overall_kpi = _task_kpi(tasks)

    # Active users with tasks
    users = db.query(User).filter(User.is_active == True).all()

    members_analytics = []
    for u in users:
        u_tasks = [t for t in tasks if str(t.assigned_to) == str(u.id)]
        if u_tasks:
            members_analytics.append(
                UserAnalytics(
                    user_id=str(u.id),
                    user_name=f"{u.first_name} {u.last_name}",
                    role=u.role,
                    kpi=_task_kpi(u_tasks),
                )
            )

    return AnalyticsResponse(
        period=period,
        kpi=overall_kpi,
        members=members_analytics,
        status_distribution=_status_distribution(tasks),
        timeline=_timeline(tasks, period),
        departments=_department_analytics(tasks, db)
    )


def get_organization_analytics(db: Session, period: str) -> AnalyticsResponse:
    since = _since(period)
    tasks = db.query(Task).filter(Task.created_at >= since).all()
    overall_kpi = _task_kpi(tasks)

    # Per-member performance breakdown
    users = db.query(User).filter(User.is_active == True).all()
    members_analytics = []
    for u in users:
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

    return AnalyticsResponse(
        period=period,
        kpi=overall_kpi,
        members=members_analytics,
        status_distribution=_status_distribution(tasks),
        timeline=_timeline(tasks, period),
        departments=_department_analytics(tasks, db)
    )


def _since(period: str) -> datetime:
    now = datetime.utcnow()
    if period == "daily":
        return now - timedelta(days=1)
    if period == "weekly":
        return now - timedelta(weeks=1)
    return now - timedelta(days=30)  # monthly
