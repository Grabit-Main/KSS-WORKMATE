import csv
import io
from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.kpi import DailyKPILog
from app.models.notification import Notification
from app.models.project import TeamMembership
from app.models.user import User
from app.schemas.kpi import KPICreate, KPIResponse, KPISummary, KPIUpdate, KPIUserSummary
from app.websocket.events import NOTIFICATION_NEW
from app.websocket.manager import manager

router = APIRouter(prefix="/api/kpi", tags=["kpi"])


def is_team_lead(db: Session, user: User) -> bool:
    if user.role == "TL":
        return True
    lead_m = db.query(TeamMembership).filter(
        TeamMembership.user_id == user.id,
        TeamMembership.is_lead == True
    ).first()
    return lead_m is not None


def get_teammate_ids_for_lead(db: Session, lead_user: User) -> List[UUID]:
    """Returns all teammate user IDs across teams where lead_user is the lead."""
    lead_teams = db.query(TeamMembership.team_id).filter(
        TeamMembership.user_id == lead_user.id,
        TeamMembership.is_lead == True
    ).scalar_subquery()

    # Members in those teams (excluding the lead themselves)
    members = db.query(TeamMembership.user_id).filter(
        TeamMembership.team_id.in_(lead_teams),
        TeamMembership.user_id != lead_user.id
    ).distinct().all()
    return [m[0] for m in members]


def get_base_kpi_query(db: Session, user: User):
    """
    Applies role-based filtering:
    - CEO, CTO, PM: see everyone's KPI
    - TL: see KPIs of their teammates, evaluated by them, or their own
    - TM: see ONLY their own KPI
    """
    q = db.query(DailyKPILog).options(
        joinedload(DailyKPILog.employee),
        joinedload(DailyKPILog.evaluator)
    )

    if user.role in ("CEO", "CTO", "PM"):
        return q
    elif is_team_lead(db, user):
        teammate_ids = get_teammate_ids_for_lead(db, user)
        # TL can see teammates' KPIs, KPIs they evaluated, and their own KPI
        return q.filter(
            or_(
                DailyKPILog.employee_id.in_(teammate_ids),
                DailyKPILog.evaluator_id == user.id,
                DailyKPILog.employee_id == user.id
            )
        )
    else:
        # TM / regular employee: only see their own KPI
        return q.filter(DailyKPILog.employee_id == user.id)


@router.get("", response_model=List[KPIResponse])
def list_kpis(
    date_val: Optional[date] = Query(None, alias="date"),
    month: Optional[str] = None,
    status: Optional[str] = None,
    employee_id: Optional[UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    today = date.today()
    if date_val and date_val > today:
        raise HTTPException(400, "Future dates are not allowed. Only present and previous dates can be viewed.")
    if start_date and start_date > today:
        raise HTTPException(400, "Future dates are not allowed. Only present and previous dates can be viewed.")
    if end_date and end_date > today:
        end_date = today

    q = get_base_kpi_query(db, user)
    # Strictly forbid future dates - only present and previous dates can be viewed
    q = q.filter(DailyKPILog.date <= today)

    if date_val:
        q = q.filter(DailyKPILog.date == date_val)
    if month:
        q = q.filter(DailyKPILog.month == month)
    if status:
        q = q.filter(DailyKPILog.status.ilike(f"%{status}%"))
    if employee_id:
        # For TM, restrict to self only
        if user.role == "TM" and employee_id != user.id:
            raise HTTPException(403, "You can only view your own KPI logs")
        q = q.filter(DailyKPILog.employee_id == employee_id)
    if start_date:
        q = q.filter(DailyKPILog.date >= start_date)
    if end_date:
        q = q.filter(DailyKPILog.date <= end_date)

    return q.order_by(DailyKPILog.date.desc(), DailyKPILog.created_at.desc()).all()


@router.get("/summary", response_model=KPISummary)
def get_kpi_summary(
    month: Optional[str] = None,
    employee_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    today = date.today()
    q = get_base_kpi_query(db, user).filter(DailyKPILog.date <= today)
    if month:
        q = q.filter(DailyKPILog.month == month)
    if employee_id:
        if user.role == "TM" and employee_id != user.id:
            raise HTTPException(403, "You can only view your own KPI summary")
        q = q.filter(DailyKPILog.employee_id == employee_id)

    logs = q.all()
    total = len(logs)
    if total == 0:
        return KPISummary(
            total_logs=0,
            average_kpi=0.0,
            status_counts={
                "Excellent": 0,
                "Very Good": 0,
                "Meets Expectation": 0,
                "Needs Improvement": 0,
                "Needs Attention": 0,
            }
        )

    avg_pct = round(sum(l.daily_kpi_percentage for l in logs) / total, 1)
    status_counts = {
        "Excellent": 0,
        "Very Good": 0,
        "Meets Expectation": 0,
        "Needs Improvement": 0,
        "Needs Attention": 0,
    }
    for l in logs:
        st = l.status
        if st in status_counts:
            status_counts[st] += 1
        else:
            status_counts[st] = 1

    return KPISummary(
        total_logs=total,
        average_kpi=avg_pct,
        status_counts=status_counts
    )


@router.get("/teammates", response_model=List[KPIUserSummary])
def get_teammates(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Returns users available for KPI evaluation or filtering:
    - TL: returns teammates under their lead
    - CEO, CTO, PM: returns all active team members / users
    - TM: returns empty list
    """
    if user.role in ("CEO", "CTO", "PM"):
        users = db.query(User).filter(User.is_active == True).order_by(User.first_name, User.last_name).all()
        return users
    elif is_team_lead(db, user):
        teammate_ids = get_teammate_ids_for_lead(db, user)
        users = db.query(User).filter(User.id.in_(teammate_ids), User.is_active == True).order_by(User.first_name, User.last_name).all()
        return users
    return []


@router.post("", response_model=KPIResponse)
async def create_or_update_kpi(
    req: KPICreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Only the team lead can give or edit the KPI to teammates daily.
    If a record exists for that employee on that date, it is updated.
    """
    if not is_team_lead(db, user):
        raise HTTPException(403, "Only Team Leads can give or edit KPIs")

    today = date.today()
    if req.date > today:
        raise HTTPException(400, "Cannot allocate KPI for future dates. Only present and previous dates are allowed.")

    # Verify employee is a teammate of this lead
    teammate_ids = get_teammate_ids_for_lead(db, user)
    if req.employee_id not in teammate_ids:
        raise HTTPException(403, "You can only give KPI to your assigned team mates")

    employee = db.query(User).filter(User.id == req.employee_id, User.is_active == True).first()
    if not employee:
        raise HTTPException(404, "Employee not found")

    pct, month_str, status_str = DailyKPILog.calculate_metrics(
        req.task_completion,
        req.quality,
        req.productivity,
        req.deadline_adherence,
        req.ownership,
        req.problem_solving,
        req.communication,
        req.team_collaboration,
        req.learning_improvement,
        req.attendance_discipline,
        req.date
    )

    # Check if a log already exists for this (employee_id, date)
    existing = db.query(DailyKPILog).filter(
        DailyKPILog.employee_id == req.employee_id,
        DailyKPILog.date == req.date
    ).first()

    if existing:
        # Update existing
        existing.evaluator_id = user.id
        existing.task_completion = req.task_completion
        existing.quality = req.quality
        existing.productivity = req.productivity
        existing.deadline_adherence = req.deadline_adherence
        existing.ownership = req.ownership
        existing.problem_solving = req.problem_solving
        existing.communication = req.communication
        existing.team_collaboration = req.team_collaboration
        existing.learning_improvement = req.learning_improvement
        existing.attendance_discipline = req.attendance_discipline
        existing.daily_kpi_percentage = pct
        existing.month = month_str
        existing.status = status_str
        existing.notes = req.notes
        existing.updated_at = datetime.utcnow()
        kpi_log = existing
    else:
        # Create new
        kpi_log = DailyKPILog(
            date=req.date,
            employee_id=req.employee_id,
            evaluator_id=user.id,
            task_completion=req.task_completion,
            quality=req.quality,
            productivity=req.productivity,
            deadline_adherence=req.deadline_adherence,
            ownership=req.ownership,
            problem_solving=req.problem_solving,
            communication=req.communication,
            team_collaboration=req.team_collaboration,
            learning_improvement=req.learning_improvement,
            attendance_discipline=req.attendance_discipline,
            daily_kpi_percentage=pct,
            month=month_str,
            status=status_str,
            notes=req.notes
        )
        db.add(kpi_log)

    # Notification to the teammate
    notif = Notification(
        user_id=req.employee_id,
        title="Daily KPI Logged",
        message=f"Your Team Lead {user.first_name} {user.last_name} evaluated your daily KPI for {req.date.strftime('%d-%b-%Y')}: {pct}% ({status_str})",
        event_type="kpi.logged",
        ref_id=str(kpi_log.id)
    )
    db.add(notif)
    db.commit()
    db.refresh(kpi_log)

    # Send real-time notification
    await manager.send_to_user(str(req.employee_id), {
        "type": NOTIFICATION_NEW,
        "data": {
            "title": "Daily KPI Logged",
            "message": f"Your KPI for {req.date.strftime('%d-%b-%Y')} is {pct}% ({status_str})"
        }
    })

    return kpi_log


@router.put("/{kpi_id}", response_model=KPIResponse)
async def update_kpi(
    kpi_id: UUID,
    req: KPIUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Only the team lead can edit the KPI to teammates daily.
    CEO, CTO, PM, TM cannot edit.
    """
    if not is_team_lead(db, user):
        raise HTTPException(403, "Only Team Leads can edit KPIs")

    kpi_log = db.query(DailyKPILog).filter(DailyKPILog.id == kpi_id).first()
    if not kpi_log:
        raise HTTPException(404, "KPI log not found")

    teammate_ids = get_teammate_ids_for_lead(db, user)
    if kpi_log.employee_id not in teammate_ids:
        raise HTTPException(403, "You can only edit KPIs of your assigned team mates")

    # Update scores
    if req.task_completion is not None:
        kpi_log.task_completion = req.task_completion
    if req.quality is not None:
        kpi_log.quality = req.quality
    if req.productivity is not None:
        kpi_log.productivity = req.productivity
    if req.deadline_adherence is not None:
        kpi_log.deadline_adherence = req.deadline_adherence
    if req.ownership is not None:
        kpi_log.ownership = req.ownership
    if req.problem_solving is not None:
        kpi_log.problem_solving = req.problem_solving
    if req.communication is not None:
        kpi_log.communication = req.communication
    if req.team_collaboration is not None:
        kpi_log.team_collaboration = req.team_collaboration
    if req.learning_improvement is not None:
        kpi_log.learning_improvement = req.learning_improvement
    if req.attendance_discipline is not None:
        kpi_log.attendance_discipline = req.attendance_discipline
    if req.notes is not None:
        kpi_log.notes = req.notes

    pct, month_str, status_str = DailyKPILog.calculate_metrics(
        kpi_log.task_completion,
        kpi_log.quality,
        kpi_log.productivity,
        kpi_log.deadline_adherence,
        kpi_log.ownership,
        kpi_log.problem_solving,
        kpi_log.communication,
        kpi_log.team_collaboration,
        kpi_log.learning_improvement,
        kpi_log.attendance_discipline,
        kpi_log.date
    )

    kpi_log.daily_kpi_percentage = pct
    kpi_log.month = month_str
    kpi_log.status = status_str
    kpi_log.evaluator_id = user.id
    kpi_log.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(kpi_log)

    await manager.send_to_user(str(kpi_log.employee_id), {
        "type": NOTIFICATION_NEW,
        "data": {
            "title": "Daily KPI Updated",
            "message": f"Your KPI for {kpi_log.date.strftime('%d-%b-%Y')} was updated: {pct}% ({status_str})"
        }
    })

    return kpi_log


@router.get("/export-csv")
def export_kpi_csv(
    month: Optional[str] = None,
    status: Optional[str] = None,
    employee_id: Optional[UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Downloadable as .csv file for CEO, CTO, PM and TL.
    TM cannot download.
    Matches exact structure from Employee_KPI_Tracker-01(Daily KPI Log).csv
    """
    can_download = user.role in ("CEO", "CTO", "PM") or is_team_lead(db, user)
    if not can_download:
        raise HTTPException(403, "Only CEO, CTO, PM and Team Leads can download KPI logs as CSV")

    today = date.today()
    if start_date and start_date > today:
        raise HTTPException(400, "Future dates are not allowed.")
    if end_date and end_date > today:
        end_date = today

    q = get_base_kpi_query(db, user).filter(DailyKPILog.date <= today)
    if month:
        q = q.filter(DailyKPILog.month == month)
    if status:
        q = q.filter(DailyKPILog.status.ilike(f"%{status}%"))
    if employee_id:
        q = q.filter(DailyKPILog.employee_id == employee_id)
    if start_date:
        q = q.filter(DailyKPILog.date >= start_date)
    if end_date:
        q = q.filter(DailyKPILog.date <= end_date)

    logs = q.order_by(DailyKPILog.date.asc(), DailyKPILog.created_at.asc()).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Reference sheet top metadata
    writer.writerow(["Daily KPI Log", "", "", "", "", "", "", "", "", "", "", "", "", "", ""])
    writer.writerow([
        "Type scores 1-5 in the blue columns (dropdowns provided). Daily KPI %, Month and Status fill in automatically. Click any column header's arrow to filter/sort - e.g. filter Status = 'Needs Attention' to see problem days, or Month = one month.",
        "", "", "", "", "", "", "", "", "", "", "", "", "", ""
    ])
    writer.writerow(["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""])

    # Headers exactly matching reference CSV
    headers = [
        "Date",
        "Employee",
        "Task Completion",
        "Quality",
        "Productivity",
        "Deadline Adherence",
        "Ownership",
        "Problem Solving",
        "Communication",
        "Team Collaboration",
        "Learning / Improvement",
        "Attendance & Discipline",
        "Daily KPI %",
        "Month",
        "Status"
    ]
    writer.writerow(headers)

    for l in logs:
        emp_name = l.employee.full_name if l.employee else "Unknown"
        date_str = l.date.strftime("%d-%b-%y") if l.date else ""
        pct_str = f"{l.daily_kpi_percentage:.1f}%"
        writer.writerow([
            date_str,
            emp_name,
            l.task_completion,
            l.quality,
            l.productivity,
            l.deadline_adherence,
            l.ownership,
            l.problem_solving,
            l.communication,
            l.team_collaboration,
            l.learning_improvement,
            l.attendance_discipline,
            pct_str,
            l.month,
            l.status
        ])

    csv_content = output.getvalue()
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    filename = f"Daily_KPI_Log_{today_str}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )
