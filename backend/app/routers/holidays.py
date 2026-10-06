import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.holiday import Holiday
from app.models.user import User
from app.dependencies import get_current_user

router = APIRouter(tags=["holidays"])


class HolidayCreate(BaseModel):
    title: str
    date: str  # Format: YYYY-MM-DD
    type: Optional[str] = "Paid Off"
    description: Optional[str] = None


INITIAL_HOLIDAYS = [
    {"title": "Ganesh Chaturthi", "date": "2026-09-14", "day_of_week": "Monday", "type": "Paid Off"},
    {"title": "Gandhi Jayanti", "date": "2026-10-02", "day_of_week": "Friday", "type": "Paid Off"},
    {"title": "Dussehra / Vijayadashami", "date": "2026-10-20", "day_of_week": "Tuesday", "type": "Paid Off"},
    {"title": "Karnataka Rajyotsava", "date": "2026-11-01", "day_of_week": "Sunday", "type": "Paid Off"},
    {"title": "Diwali / Deepavali", "date": "2026-11-08", "day_of_week": "Sunday", "type": "Paid Off"},
    {"title": "Christmas", "date": "2026-12-25", "day_of_week": "Friday", "type": "Paid Off"},
]


@router.get("/api/holidays")
def get_holidays(db: Session = Depends(get_db)):
    db_holidays = db.query(Holiday).all()
    if not db_holidays:
        # Seed the 6 official 2026 holidays
        for h in INITIAL_HOLIDAYS:
            new_h = Holiday(
                id=uuid.uuid4(),
                title=h["title"],
                date=h["date"],
                day_of_week=h["day_of_week"],
                type=h["type"]
            )
            db.add(new_h)
        db.commit()
        db_holidays = db.query(Holiday).all()

    # Sort holidays chronologically
    sorted_holidays = sorted(db_holidays, key=lambda x: x.date)

    return [
        {
            "id": str(h.id),
            "title": h.title,
            "date": h.date,
            "day_of_week": h.day_of_week or "N/A",
            "type": h.type or "Paid Off",
            "description": h.description
        }
        for h in sorted_holidays
    ]


@router.post("/api/holidays")
def create_holiday(req: HolidayCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "TL":
        raise HTTPException(status_code=403, detail="Only Team Lead (TL) can add official holidays.")

    day_name = ""
    try:
        dt = datetime.strptime(req.date.strip(), "%Y-%m-%d")
        day_name = dt.strftime("%A")
    except Exception:
        day_name = ""

    new_holiday = Holiday(
        id=uuid.uuid4(),
        title=req.title.strip(),
        date=req.date.strip(),
        day_of_week=day_name,
        type=req.type or "Paid Off",
        description=req.description.strip() if req.description else None,
        created_by=str(current_user.id)
    )
    db.add(new_holiday)
    db.commit()
    db.refresh(new_holiday)

    return {
        "id": str(new_holiday.id),
        "title": new_holiday.title,
        "date": new_holiday.date,
        "day_of_week": new_holiday.day_of_week,
        "type": new_holiday.type,
        "description": new_holiday.description
    }


@router.delete("/api/holidays/{holiday_id}")
def delete_holiday(holiday_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "TL":
        raise HTTPException(status_code=403, detail="Only Team Lead (TL) can delete official holidays.")

    try:
        h_uuid = uuid.UUID(holiday_id)
        h = db.query(Holiday).filter(Holiday.id == h_uuid).first()
        if h:
            db.delete(h)
            db.commit()
            return {"status": "success", "message": "Holiday deleted"}
    except Exception as e:
        print("Delete holiday error:", e)

    raise HTTPException(status_code=404, detail="Holiday not found")
