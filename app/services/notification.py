import uuid
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.domain import Notification
from app.repositories.notification import NotificationRepository

class NotificationQueryService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.notif_repo = NotificationRepository(session)

    async def get_user_notifications(
        self,
        user_id: uuid.UUID,
        unread_only: bool = False,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[Notification], int]:
        return await self.notif_repo.get_user_notifications(user_id, unread_only=unread_only, skip=skip, limit=limit)

    async def mark_all_as_read(self, user_id: uuid.UUID) -> None:
        await self.notif_repo.mark_all_as_read(user_id)
        await self.session.commit()
