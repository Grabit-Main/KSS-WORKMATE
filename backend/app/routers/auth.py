import random
import string
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.user import (
    LoginRequest, TokenResponse, UserResponse,
    ForgotPasswordRequest, VerifyOTPRequest, ResetPasswordRequest, ChangePasswordRequest, UserUpdate,
)
from app.utils.security import verify_password, hash_password, create_access_token, create_refresh_token, decode_jwt
from app.services.email_service import send_otp_email
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/warmup")
def warmup(db: Session = Depends(get_db)):
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
    except Exception:
        pass
    return {"status": "ok"}


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


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(req: dict, db: Session = Depends(get_db)):
    tok = req.get("refresh_token")
    if not tok:
        raise HTTPException(status_code=400, detail="Missing refresh token")
    payload = decode_jwt(tok)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    new_payload = {"sub": str(user.id), "role": user.role}
    return TokenResponse(
        access_token=create_access_token(new_payload),
        refresh_token=create_refresh_token(new_payload),
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
        raise HTTPException(status_code=404, detail="Email not found")
    otp = "".join(random.choices(string.digits, k=6))
    user.otp_code = otp
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.commit()
    # Send directly so serverless execution environment does not freeze before completion
    send_otp_email(req.email, otp)
    return {"message": "OTP has been sent to your email."}


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


@router.post("/send-password-otp")
def send_password_otp(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    otp = "".join(random.choices(string.digits, k=6))
    user.otp_code = otp
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.commit()
    send_otp_email(user.email, otp)
    return {"message": f"OTP has been sent to {user.email}"}


@router.post("/change-password")
def change_password(req: ChangePasswordRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if req.new_password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    if not user.otp_code or user.otp_code != req.otp or not user.otp_expires_at:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    if datetime.utcnow() > user.otp_expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired")
    user.hashed_password = hash_password(req.new_password)
    user.otp_code = None
    user.otp_expires_at = None
    db.commit()
    return {"message": "Password updated successfully"}


@router.get("/google-client-id")
def get_google_client_id():
    return {"client_id": settings.GOOGLE_CLIENT_ID or ""}


