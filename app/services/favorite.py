import uuid
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.domain import Favorite
from app.models.enums import FavoriteTargetType
from app.schemas.favorite import FavoriteCreate
from app.repositories.favorite import FavoriteRepository
from app.repositories.job import JobRepository
from app.repositories.profile import WorkerProfileRepository
from app.core.exceptions import ConflictException, NotFoundException

class FavoriteService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.fav_repo = FavoriteRepository(session)
        self.job_repo = JobRepository(session)
        self.worker_repo = WorkerProfileRepository(session)

    async def add_favorite(self, user_id: uuid.UUID, data: FavoriteCreate) -> Favorite:
        existing = await self.fav_repo.get_by_user_and_target(user_id, data.target_type, data.target_id)
        if existing:
            raise ConflictException("Target already in favorites")

        if data.target_type == FavoriteTargetType.JOB:
            job = await self.job_repo.get_by_id(data.target_id)
            if not job:
                raise NotFoundException("Job not found")
        elif data.target_type == FavoriteTargetType.WORKER:
            worker = await self.worker_repo.get_by_user_id(data.target_id)
            if not worker:
                raise NotFoundException("Worker profile not found")

        favorite = Favorite(
            user_id=user_id,
            target_type=data.target_type,
            target_id=data.target_id
        )
        favorite = await self.fav_repo.create(favorite)
        await self.session.commit()
        return favorite

    async def remove_favorite(self, user_id: uuid.UUID, target_type: FavoriteTargetType, target_id: uuid.UUID) -> None:
        favorite = await self.fav_repo.get_by_user_and_target(user_id, target_type, target_id)
        if not favorite:
            raise NotFoundException("Favorite item not found")

        await self.fav_repo.delete(favorite)
        await self.session.commit()

    async def list_favorites(
        self,
        user_id: uuid.UUID,
        target_type: Optional[FavoriteTargetType] = None,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[Favorite], int]:
        return await self.fav_repo.get_user_favorites(user_id, target_type=target_type, skip=skip, limit=limit)
