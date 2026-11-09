import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.push_subscription import PushSubscription
from app.routers.auth import get_current_user
from app.config import settings
from app.utils.webpush_service import dispatch_push_to_users

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/push", tags=["Push Notifications"])


class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionCreate(BaseModel):
    endpoint: str
    keys: PushSubscriptionKeys
    expirationTime: Optional[int] = None


class PushUnsubscribeRequest(BaseModel):
    endpoint: str


@router.get("/vapid-public-key")
def get_vapid_public_key():
    """
    Returns the VAPID Public Key required by browser pushManager.subscribe()
    """
    return {"publicKey": settings.VAPID_PUBLIC_KEY}


@router.post("/subscribe")
def subscribe_device(
    payload: PushSubscriptionCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Registers or refreshes a browser push subscription for the logged-in user.
    """
    user_agent = request.headers.get("user-agent", "")[:250]

    existing = db.query(PushSubscription).filter(PushSubscription.endpoint == payload.endpoint).first()
    if existing:
        existing.user_id = user.id
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
        existing.user_agent = user_agent
        db.commit()
        db.refresh(existing)
        return {"status": "updated", "id": str(existing.id)}

    sub = PushSubscription(
        user_id=user.id,
        endpoint=payload.endpoint,
        p256dh=payload.keys.p256dh,
        auth=payload.keys.auth,
        user_agent=user_agent
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return {"status": "created", "id": str(sub.id)}


@router.post("/unsubscribe")
def unsubscribe_device(
    payload: PushUnsubscribeRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Removes a browser push subscription by endpoint.
    """
    sub = db.query(PushSubscription).filter(
        PushSubscription.endpoint == payload.endpoint,
        PushSubscription.user_id == user.id
    ).first()

    if sub:
        db.delete(sub)
        db.commit()
        return {"status": "removed"}
    return {"status": "not_found"}


@router.post("/test")
async def send_test_push(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Dispatches a test push notification to all subscribed devices of the current user.
    """
    payload = {
        "title": "KSS Workmate Test Notification",
        "body": f"Hello {user.first_name}! Desktop push notifications are working perfectly on this device.",
        "icon": "/logo.webp",
        "badge": "/favicon.ico",
        "url": "/collaboration",
        "tag": "workmate-test-push"
    }

    await dispatch_push_to_users([user.id], payload)
    return {"status": "dispatched", "message": "Test push delivered to active subscriptions."}

