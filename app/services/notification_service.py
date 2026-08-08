import uuid
import logging
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.domain import User, UserSettings, Notification
from app.models.enums import NotificationType
from app.websocket.manager import ws_manager

logger = logging.getLogger(__name__)


class NotificationService:
    @staticmethod
    async def send_notification(
        session: AsyncSession,
        user_id: uuid.UUID,
        title: str,
        body: str,
        type: NotificationType = NotificationType.SYSTEM,
        payload: Optional[Dict[str, Any]] = None
    ) -> Optional[Notification]:
        """
        Central Notification Dispatcher:
        1. Checks UserSettings (push/email preferences).
        2. Persists Notification record in PostgreSQL DB.
        3. Delivers real-time WebSocket event to active user connections (fast, in-memory).
        4. Enqueues Celery task for slow I/O: Telegram + Email dispatch.
        """
        try:
            # 1. Fetch user and user_settings
            stmt = select(User).where(User.id == user_id)
            res = await session.execute(stmt)
            user = res.scalar_one_or_none()
            if not user:
                return None

            stmt_set = select(UserSettings).where(UserSettings.user_id == user_id)
            res_set = await session.execute(stmt_set)
            user_settings = res_set.scalar_one_or_none()

            push_enabled = user_settings.push_notifications if user_settings else True

            # 2. Persist notification in DB (fast — local PostgreSQL)
            notif = Notification(
                user_id=user_id,
                title=title,
                body=body,
                type=type,
                is_read=False,
                payload=payload or {}
            )
            session.add(notif)
            await session.commit()
            await session.refresh(notif)

            # 3. Live WebSocket Delivery (fast — in-memory broadcast)
            if push_enabled:
                ws_payload = {
                    "event": "new_notification",
                    "notification": {
                        "id": str(notif.id),
                        "title": notif.title,
                        "body": notif.body,
                        "type": notif.type.value if hasattr(notif.type, 'value') else str(notif.type),
                        "is_read": False,
                        "created_at": notif.created_at.isoformat() if hasattr(notif, 'created_at') and notif.created_at else "",
                        "payload": notif.payload
                    }
                }
                await ws_manager.send_to_user(user_id, ws_payload)

            # 4. Enqueue Celery task for slow I/O (Email + Telegram)
            #    This returns immediately — the actual dispatch happens in the worker.
            try:
                from app.celery.tasks import dispatch_notification_task
                dispatch_notification_task.delay(
                    user_id=str(user_id),
                    title=title,
                    body=body,
                    notification_type=type.value if hasattr(type, 'value') else str(type),
                    payload=payload,
                )
            except Exception as celery_err:
                # If Redis/Celery is unavailable, log but don't fail the request.
                # The notification is already persisted in DB and delivered via WebSocket.
                logger.warning(
                    "Failed to enqueue notification dispatch to Celery: %s (notification %s still saved in DB)",
                    celery_err, notif.id,
                )

            return notif
        except Exception as err:
            logger.error(f"Error in NotificationService.send_notification: {err}")
            return None
