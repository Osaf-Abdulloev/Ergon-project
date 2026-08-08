import uuid
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.models.domain import Resume
from app.models.enums import ResumeStatus
from app.repositories.base import BaseRepository

class ResumeRepository(BaseRepository[Resume]):
    def __init__(self, session: AsyncSession):
        super().__init__(Resume, session)

    async def get_by_id_and_user(self, resume_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Resume]:
        stmt = select(Resume).where(Resume.id == resume_id, Resume.user_id == user_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_user_resumes(self, user_id: uuid.UUID) -> List[Resume]:
        stmt = (
            select(Resume)
            .where(Resume.user_id == user_id)
            .order_by(Resume.updated_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_user_published_resume(self, user_id: uuid.UUID) -> Optional[Resume]:
        stmt = (
            select(Resume)
            .where(Resume.user_id == user_id, Resume.is_published == True)
            .order_by(Resume.published_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def unpublish_user_resumes(self, user_id: uuid.UUID) -> None:
        """
        Unpublishes any existing published resume for the user to ensure only 1 primary active published resume.
        """
        stmt = select(Resume).where(Resume.user_id == user_id, Resume.is_published == True)
        result = await self.session.execute(stmt)
        for r in result.scalars().all():
            r.is_published = False
            r.status = ResumeStatus.DRAFT
            self.session.add(r)
        await self.session.flush()
