import uuid
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.domain import Application, Job, User, Notification, Company
from app.models.enums import ApplicationStatus, JobStatus, NotificationType
from app.schemas.application import ApplicationCreate
from app.repositories.application import ApplicationRepository
from app.repositories.job import JobRepository
from app.repositories.profile import CompanyRepository
from app.repositories.notification import NotificationRepository
from app.core.exceptions import NotFoundException, ConflictException, ForbiddenException

class ApplicationService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.app_repo = ApplicationRepository(session)
        self.job_repo = JobRepository(session)
        self.company_repo = CompanyRepository(session)
        self.notif_repo = NotificationRepository(session)

    async def apply_to_job(self, worker_id: uuid.UUID, data: ApplicationCreate) -> Application:
        job = await self.job_repo.get_by_id(data.job_id)
        if not job or job.status != JobStatus.OPEN:
            raise NotFoundException("Job listing is not open or does not exist")

        existing = await self.app_repo.get_by_worker_and_job(worker_id, data.job_id)
        if existing:
            raise ConflictException("You have already applied for this job")

        application = Application(
            worker_id=worker_id,
            job_id=data.job_id,
            cover_note=data.cover_note,
            status=ApplicationStatus.PENDING
        )
        application = await self.app_repo.create(application)

        company = await self.company_repo.get_by_id(job.company_id)
        if company:
            notif = Notification(
                user_id=company.employer_id,
                type=NotificationType.NEW_APPLICATION,
                payload={
                    "application_id": str(application.id),
                    "job_id": str(job.id),
                    "job_title": job.title,
                    "worker_id": str(worker_id)
                }
            )
            await self.notif_repo.create(notif)

        await self.session.commit()
        return await self.app_repo.get_with_details(application.id)

    async def update_application_status(
        self,
        employer_id: uuid.UUID,
        application_id: uuid.UUID,
        new_status: ApplicationStatus
    ) -> Application:
        application = await self.app_repo.get_with_details(application_id)
        if not application:
            raise NotFoundException("Application not found")

        company = await self.company_repo.get_by_employer_id(employer_id)
        if not company or application.job.company_id != company.id:
            raise ForbiddenException("Not authorized to update this application")

        application.status = new_status
        await self.app_repo.update(application)

        notif = Notification(
            user_id=application.worker_id,
            type=NotificationType.STATUS_CHANGE,
            payload={
                "application_id": str(application.id),
                "job_id": str(application.job_id),
                "job_title": application.job.title,
                "status": new_status.value
            }
        )
        await self.notif_repo.create(notif)

        await self.session.commit()
        return application

    async def get_worker_applications(
        self,
        worker_id: uuid.UUID,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[Application], int]:
        return await self.app_repo.get_worker_applications(worker_id, skip=skip, limit=limit)

    async def get_job_applications(
        self,
        employer_id: uuid.UUID,
        job_id: uuid.UUID,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[Application], int]:
        company = await self.company_repo.get_by_employer_id(employer_id)
        if not company:
            raise NotFoundException("Company not found")

        job = await self.job_repo.get_by_id(job_id)
        if not job or job.company_id != company.id:
            raise ForbiddenException("Not authorized to view applications for this job")

        return await self.app_repo.get_job_applications(job_id, skip=skip, limit=limit)
