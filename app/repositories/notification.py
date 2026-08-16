import uuid
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, update
from app.models.domain import Notification
from app.repositories.base import BaseRepository

class NotificationRepository(BaseRepository[Notification]):
    def __init__(self, session: AsyncSession):
        super().__init__(Notification, session)

    async def get_user_notifications(
        self,
        user_id: uuid.UUID,
        unread_only: bool = False,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[Notification], int]:
        query = select(Notification).where(Notification.user_id == user_id)
        count_stmt = select(func.count(Notification.id)).where(Notification.user_id == user_id)

        if unread_only:
            query = query.where(Notification.is_read == False)
            count_stmt = count_stmt.where(Notification.is_read == False)

        total = (await self.session.execute(count_stmt)).scalar_one()

        result = await self.session.execute(query.order_by(Notification.created_at.desc()).offset(skip).limit(limit))
        return list(result.scalars().all()), total

    async def mark_all_as_read(self, user_id: uuid.UUID) -> None:
        await self.session.execute(
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)
            .values(is_read=True)
        )
        await self.session.flush()
