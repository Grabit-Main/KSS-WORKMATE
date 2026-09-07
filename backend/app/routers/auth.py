import random
import string
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.user import (
    LoginRequest, TokenResponse, UserResponse,
    ForgotPasswordRequest, VerifyOTPRequest, ResetPasswordRequest, UserUpdate,
)
from app.utils.security import verify_password, hash_password, create_access_token, create_refresh_token
from app.services.email_service import send_otp_email
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email, User.is_active == True).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    payload = {"sub": str(user.id), "role": user.role}
    return TokenResponse(
        access_token=create_access_token(payload),
        refresh_token=create_refresh_token(payload),
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return user


@router.put("/me", response_model=UserResponse)
def update_me(req: UserUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    for field, val in req.model_dump(exclude_none=True).items():
        # users can't self-promote role
        if field == "role":
            continue
        setattr(user, field, val)
    db.commit()
    db.refresh(user)
    return user


@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        # Don't leak whether email exists
        return {"message": "If that email is registered, an OTP has been sent."}
    otp = "".join(random.choices(string.digits, k=6))
    user.otp_code = otp
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.commit()
    send_otp_email(req.email, otp)
    return {"message": "If that email is registered, an OTP has been sent."}


@router.post("/verify-otp")
def verify_otp(req: VerifyOTPRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or user.otp_code != req.otp or not user.otp_expires_at:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    if datetime.utcnow() > user.otp_expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired")
    return {"valid": True}


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    if req.new_password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    user = db.query(User).filter(User.email == req.email).first()
    if not user or user.otp_code != req.otp or not user.otp_expires_at:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    if datetime.utcnow() > user.otp_expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired")
    user.hashed_password = hash_password(req.new_password)
    user.otp_code = None
    user.otp_expires_at = None
    db.commit()
    return {"message": "Password updated successfully"}
