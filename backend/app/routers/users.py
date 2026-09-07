from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.utils.security import hash_password
from app.dependencies import get_current_user, require_ceo_cto

router = APIRouter(prefix="/api/users", tags=["users"])

# Hierarchy order for sorting: CTO, CEO, PM, TL, TM
ROLE_ORDER = {"CTO": 0, "CEO": 1, "PM": 2, "TL": 3, "TM": 4}

# Roles where only one instance is allowed system-wide
SINGLETON_ROLES = {"CEO", "CTO"}


@router.get("", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db), _=Depends(require_ceo_cto)):
    users = db.query(User).all()
    # Sort by role hierarchy: CTO, CEO, PM, TL, TM
    users.sort(key=lambda u: ROLE_ORDER.get(u.role, 99))
    return users


@router.post("", response_model=UserResponse)
def create_user(req: UserCreate, db: Session = Depends(get_db), _=Depends(require_ceo_cto)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(400, "Email already registered")

    # Only PM can make TM as TL during project assignment
    if req.role == "TL":
        raise HTTPException(400, "Team Leads (TL) can only be assigned by a Project Manager during project assignment.")

    # Enforce singleton roles: only 1 CEO and 1 CTO allowed
    if req.role in SINGLETON_ROLES:
        existing = db.query(User).filter(User.role == req.role).first()
        if existing:
            raise HTTPException(400, f"A {req.role} already exists. Only one {req.role} is allowed.")

    user = User(
        email=req.email,
        hashed_password=hash_password(req.password),
        first_name=req.first_name,
        last_name=req.last_name,
        role=req.role,
        department=req.department,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: UUID, db: Session = Depends(get_db), _=Depends(require_ceo_cto)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: UUID, req: UserUpdate, db: Session = Depends(get_db), _=Depends(require_ceo_cto)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.role in ("CEO", "CTO") and req.is_active is False:
        raise HTTPException(400, "CEO and CTO accounts cannot be disabled")

    # If user is CEO or CTO, they cannot change their role to another role
    if user.role in SINGLETON_ROLES and req.role and req.role != user.role:
        raise HTTPException(400, f"{user.role} role cannot be changed to another role.")

    # Only PM can make TM as TL during project assignment
    if req.role == "TL" and user.role != "TL":
        raise HTTPException(400, "Team Leads (TL) can only be assigned by a Project Manager during project assignment.")

    # If changing role to a singleton role, check uniqueness
    if req.role and req.role in SINGLETON_ROLES and req.role != user.role:
        existing = db.query(User).filter(User.role == req.role).first()
        if existing:
            raise HTTPException(400, f"A {req.role} already exists. Only one {req.role} is allowed.")

    if req.email and req.email != user.email:
        if db.query(User).filter(User.email == req.email, User.id != user_id).first():
            raise HTTPException(400, "Email already registered")
    for field, val in req.model_dump(exclude_none=True).items():
        setattr(user, field, val)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
def delete_user(user_id: UUID, db: Session = Depends(get_db), _=Depends(require_ceo_cto)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.role in ("CEO", "CTO"):
        raise HTTPException(400, "CEO and CTO accounts cannot be deleted")
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}
