import uuid
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.models.domain import Favorite
from app.models.enums import FavoriteTargetType
from app.repositories.base import BaseRepository

class FavoriteRepository(BaseRepository[Favorite]):
    def __init__(self, session: AsyncSession):
        super().__init__(Favorite, session)

    async def get_by_user_and_target(
        self,
        user_id: uuid.UUID,
        target_type: FavoriteTargetType,
        target_id: uuid.UUID
    ) -> Optional[Favorite]:
        result = await self.session.execute(
            select(Favorite).where(
                Favorite.user_id == user_id,
                Favorite.target_type == target_type,
                Favorite.target_id == target_id
            )
        )
        return result.scalars().first()

    async def get_user_favorites(
        self,
        user_id: uuid.UUID,
        target_type: Optional[FavoriteTargetType] = None,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[Favorite], int]:
        query = select(Favorite).where(Favorite.user_id == user_id)
        if target_type:
            query = query.where(Favorite.target_type == target_type)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar_one()

        result = await self.session.execute(query.order_by(Favorite.created_at.desc()).offset(skip).limit(limit))
        return list(result.scalars().all()), total
