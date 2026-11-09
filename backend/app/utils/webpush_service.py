import json
import logging
from typing import List, Optional
from uuid import UUID
from app.config import settings

logger = logging.getLogger(__name__)

# Try to import pywebpush if installed in the deployment environment
try:
    from pywebpush import webpush, WebPushException
    PYWEBPUSH_AVAILABLE = True
except ImportError:
    PYWEBPUSH_AVAILABLE = False
    logger.warning("[WebPush] pywebpush package is not installed; web push delivery will be logged only.")


def send_single_push(subscription_info: dict, payload: dict) -> bool:
    """
    Synchronous helper to execute pywebpush delivery.
    Returns True if sent, False if subscription is invalid/expired (404/410).
    """
    if not PYWEBPUSH_AVAILABLE:
        return True

    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_PUBLIC_KEY:
        logger.warning("[WebPush] VAPID keys not configured; skipping push.")
        return False

    try:
        webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": f"mailto:{settings.VAPID_CLAIM_EMAIL}"}
        )
        return True
    except WebPushException as ex:
        logger.warning(f"[WebPush] WebPushException: {ex}")
        # Response status 404 or 410 indicates the push service unsubscribed or expired
        if ex.response is not None and ex.response.status_code in (404, 410):
            return False
        return True
    except Exception as e:
        logger.error(f"[WebPush] Unexpected error delivering push: {e}")
        return True


async def dispatch_push_to_users(user_ids: List[UUID], payload: dict):
    """
    Async background task to deliver Web Push notifications to user subscriptions.
    Automatically removes dead subscriptions (404/410).
    """
    if not user_ids:
        return

    try:
        import asyncio
        from app.database import SessionLocal
        from app.models.push_subscription import PushSubscription

        def _sync_worker():
            db = SessionLocal()
            try:
                subs = db.query(PushSubscription).filter(PushSubscription.user_id.in_(user_ids)).all()
                if not subs:
                    return

                dead_subs = []
                for sub in subs:
                    sub_info = {
                        "endpoint": sub.endpoint,
                        "keys": {
                            "p256dh": sub.p256dh,
                            "auth": sub.auth
                        }
                    }
                    success = send_single_push(sub_info, payload)
                    if not success:
                        dead_subs.append(sub)

                if dead_subs:
                    for d in dead_subs:
                        db.delete(d)
                    db.commit()
            except Exception as e:
                logger.error(f"[WebPush] Worker error: {e}")
                db.rollback()
            finally:
                db.close()

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _sync_worker)
    except Exception as e:
        logger.error(f"[WebPush] Background task dispatch failed: {e}")

