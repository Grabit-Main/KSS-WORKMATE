from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from app.database import get_db
from app.models.user import User
from app.schemas.analytics import AnalyticsResponse
from app.dependencies import get_current_user, require_ceo_cto, require_pm_up
from app.services import analytics_service

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/team/{team_id}", response_model=AnalyticsResponse)
def get_team_analytics(team_id: UUID, period: str = "monthly", db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if period not in ("daily", "weekly", "monthly"):
        raise HTTPException(400, "Invalid period")
    if user.role not in ("CEO", "CTO", "HR", "PM"):
        raise HTTPException(403, "Access denied")
    return analytics_service.get_team_analytics(db, str(team_id), period)


@router.get("/user/{user_id}", response_model=AnalyticsResponse)
def get_user_analytics(user_id: UUID, period: str = "monthly", db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if period not in ("daily", "weekly", "monthly"):
        raise HTTPException(400, "Invalid period")
    if user.role not in ("CEO", "CTO", "HR", "PM") and str(user.id) != str(user_id):
        raise HTTPException(403, "Access denied")
    return analytics_service.get_user_analytics(db, str(user_id), period)


@router.get("/daily", response_model=AnalyticsResponse)
def get_daily_me(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role in ("CEO", "CTO", "HR"):
        return analytics_service.get_organization_analytics(db, "daily")
    return analytics_service.get_user_analytics(db, str(user.id), "daily")


@router.get("/weekly", response_model=AnalyticsResponse)
def get_weekly_me(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role in ("CEO", "CTO", "HR"):
        return analytics_service.get_organization_analytics(db, "weekly")
    return analytics_service.get_user_analytics(db, str(user.id), "weekly")


@router.get("/monthly", response_model=AnalyticsResponse)
def get_monthly_me(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role in ("CEO", "CTO", "HR"):
        return analytics_service.get_organization_analytics(db, "monthly")
    return analytics_service.get_user_analytics(db, str(user.id), "monthly")
