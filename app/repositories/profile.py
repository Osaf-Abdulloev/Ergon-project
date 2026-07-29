import uuid
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func
from app.models.domain import WorkerProfile, Company, Skill, WorkerSkill, Experience, User
from app.repositories.base import BaseRepository

class WorkerProfileRepository(BaseRepository[WorkerProfile]):
    def __init__(self, session: AsyncSession):
        super().__init__(WorkerProfile, session)

    async def get_by_user_id(self, user_id: uuid.UUID) -> Optional[WorkerProfile]:
        result = await self.session.execute(
            select(WorkerProfile)
            .options(
                selectinload(WorkerProfile.worker_skills).selectinload(WorkerSkill.skill),
                selectinload(WorkerProfile.experiences),
                selectinload(WorkerProfile.user)
            )
            .where(WorkerProfile.user_id == user_id)
        )
        return result.scalars().first()

    async def search_workers(
        self,
        name: Optional[str] = None,
        skill: Optional[str] = None,
        city: Optional[str] = None,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[WorkerProfile], int]:
        query = select(WorkerProfile).join(WorkerProfile.user).options(
            selectinload(WorkerProfile.worker_skills).selectinload(WorkerSkill.skill),
            selectinload(WorkerProfile.experiences),
            selectinload(WorkerProfile.user)
        )
        
        if name:
            query = query.where(User.username.ilike(f"%{name}%"))
        if city:
            query = query.where(User.city.ilike(f"%{city}%"))
        if skill:
            query = query.join(WorkerProfile.worker_skills).join(WorkerSkill.skill).where(Skill.name.ilike(f"%{skill}%"))
        
        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar_one()

        result = await self.session.execute(query.offset(skip).limit(limit))
        return list(result.scalars().unique().all()), total

class CompanyRepository(BaseRepository[Company]):
    def __init__(self, session: AsyncSession):
        super().__init__(Company, session)

    async def get_by_employer_id(self, employer_id: uuid.UUID) -> Optional[Company]:
        result = await self.session.execute(
            select(Company).where(Company.employer_id == employer_id)
        )
        return result.scalars().first()

class SkillRepository(BaseRepository[Skill]):
    def __init__(self, session: AsyncSession):
        super().__init__(Skill, session)

    async def get_by_name(self, name: str) -> Optional[Skill]:
        result = await self.session.execute(
            select(Skill).where(func.lower(Skill.name) == func.lower(name))
        )
        return result.scalars().first()

    async def get_or_create(self, name: str) -> Skill:
        clean_name = name.strip()
        skill = await self.get_by_name(clean_name)
        if not skill:
            skill = Skill(name=clean_name)
            self.session.add(skill)
            await self.session.flush()
        return skill
