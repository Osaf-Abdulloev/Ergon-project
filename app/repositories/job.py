import uuid
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func
from app.models.domain import Job, Company
from app.models.enums import EmploymentType, JobStatus
from app.repositories.base import BaseRepository

class JobRepository(BaseRepository[Job]):
    def __init__(self, session: AsyncSession):
        super().__init__(Job, session)

    async def get_with_company(self, job_id: uuid.UUID) -> Optional[Job]:
        result = await self.session.execute(
            select(Job)
            .options(selectinload(Job.company))
            .where(Job.id == job_id)
        )
        return result.scalars().first()

    async def search_jobs(
        self,
        title: Optional[str] = None,
        category: Optional[str] = None,
        location: Optional[str] = None,
        employment_type: Optional[EmploymentType] = None,
        salary_min: Optional[float] = None,
        salary_max: Optional[float] = None,
        status: Optional[JobStatus] = JobStatus.OPEN,
        company_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[Job], int]:
        query = select(Job).options(selectinload(Job.company))

        if status:
            query = query.where(Job.status == status)
        if company_id:
            query = query.where(Job.company_id == company_id)
        if title:
            query = query.where(Job.title.ilike(f"%{title}%"))
        if category:
            query = query.where(Job.category.ilike(f"%{category}%"))
        if location:
            query = query.where(Job.location.ilike(f"%{location}%"))
        if employment_type:
            query = query.where(Job.employment_type == employment_type)
        if salary_min is not None:
            query = query.where(Job.salary_max >= salary_min)
        if salary_max is not None:
            query = query.where(Job.salary_min <= salary_max)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar_one()

        result = await self.session.execute(query.order_by(Job.created_at.desc()).offset(skip).limit(limit))
        return list(result.scalars().all()), total
