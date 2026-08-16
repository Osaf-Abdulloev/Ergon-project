import uuid
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func
from app.models.domain import Application, Job, Company, User, WorkerProfile, WorkerSkill
from app.models.enums import ApplicationStatus
from app.repositories.base import BaseRepository

class ApplicationRepository(BaseRepository[Application]):
    def __init__(self, session: AsyncSession):
        super().__init__(Application, session)

    async def get_by_worker_and_job(self, worker_id: uuid.UUID, job_id: uuid.UUID) -> Optional[Application]:
        result = await self.session.execute(
            select(Application).where(Application.worker_id == worker_id, Application.job_id == job_id)
        )
        return result.scalars().first()

    async def get_worker_applications(
        self,
        worker_id: uuid.UUID,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[Application], int]:
        query = (
            select(Application)
            .options(
                selectinload(Application.job).selectinload(Job.company),
                selectinload(Application.status_history)
            )
            .where(Application.worker_id == worker_id)
            .distinct()
        )
        count_query = select(func.count(func.distinct(Application.id))).where(Application.worker_id == worker_id)
        total = (await self.session.execute(count_query)).scalar_one()

        result = await self.session.execute(query.order_by(Application.created_at.desc()).offset(skip).limit(limit))
        raw_items = list(result.scalars().all())
        
        seen_ids = set()
        unique_items = []
        for item in raw_items:
            if item.id not in seen_ids:
                seen_ids.add(item.id)
                unique_items.append(item)
                
        return unique_items, total

    async def get_job_applications(
        self,
        job_id: uuid.UUID,
        status_filter: Optional[ApplicationStatus] = None,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[Application], int]:
        query = (
            select(Application)
            .options(
                selectinload(Application.worker),
                selectinload(Application.job).selectinload(Job.company),
                selectinload(Application.status_history)
            )
            .where(Application.job_id == job_id)
            .distinct()
        )
        if status_filter:
            query = query.where(Application.status == status_filter)

        count_query = select(func.count(func.distinct(Application.id))).where(Application.job_id == job_id)
        if status_filter:
            count_query = count_query.where(Application.status == status_filter)

        total = (await self.session.execute(count_query)).scalar_one()

        result = await self.session.execute(query.order_by(Application.created_at.desc()).offset(skip).limit(limit))
        raw_items = list(result.scalars().all())

        seen_ids = set()
        unique_items = []
        for item in raw_items:
            if item.id not in seen_ids:
                seen_ids.add(item.id)
                unique_items.append(item)

        return unique_items, total

    async def get_with_details(self, application_id: uuid.UUID) -> Optional[Application]:
        result = await self.session.execute(
            select(Application)
            .options(
                selectinload(Application.worker),
                selectinload(Application.job).selectinload(Job.company),
                selectinload(Application.status_history)
            )
            .where(Application.id == application_id)
        )
        return result.scalars().first()

    async def get_employer_applications(
        self,
        employer_id: uuid.UUID,
        status_filter: Optional[ApplicationStatus] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[Application], int]:
        query = (
            select(Application)
            .join(Job, Application.job_id == Job.id)
            .outerjoin(Company, Job.company_id == Company.id)
            .options(
                selectinload(Application.worker).selectinload(User.worker_profile).selectinload(WorkerProfile.worker_skills).selectinload(WorkerSkill.skill),
                selectinload(Application.worker).selectinload(User.worker_profile).selectinload(WorkerProfile.experiences),
                selectinload(Application.worker).selectinload(User.worker_profile).selectinload(WorkerProfile.certificates),
                selectinload(Application.job).selectinload(Job.company),
                selectinload(Application.status_history)
            )
            .where(
                (Company.employer_id == employer_id) | (Job.external_source == f"employer_{employer_id}")
            )
            .distinct()
        )
        if status_filter:
            query = query.where(Application.status == status_filter)

        count_query = (
            select(func.count(func.distinct(Application.id)))
            .select_from(Application)
            .join(Job, Application.job_id == Job.id)
            .outerjoin(Company, Job.company_id == Company.id)
            .where(
                (Company.employer_id == employer_id) | (Job.external_source == f"employer_{employer_id}")
            )
        )
        if status_filter:
            count_query = count_query.where(Application.status == status_filter)

        total = (await self.session.execute(count_query)).scalar_one()

        result = await self.session.execute(query.order_by(Application.created_at.desc()).offset(skip).limit(limit))
        raw_items = list(result.scalars().all())

        seen_ids = set()
        unique_items = []
        for item in raw_items:
            if item.id not in seen_ids:
                seen_ids.add(item.id)
                unique_items.append(item)

        return unique_items, total
