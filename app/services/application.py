import uuid
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
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
            raise NotFoundException("Вакансия закрыта или не существует")

        existing = await self.app_repo.get_by_worker_and_job(worker_id, data.job_id)
        if existing:
            raise ConflictException("Вы уже откликались на эту вакансию. Повторный отклик невозможен.")

        try:
            application = Application(
                worker_id=worker_id,
                job_id=data.job_id,
                cover_note=data.cover_note or data.cover_letter,
                cover_letter=data.cover_letter or data.cover_note,
                resume_url=data.resume_url,
                status=ApplicationStatus.PENDING
            )
            application = await self.app_repo.create(application)

            company = await self.company_repo.get_by_id(job.company_id) if job.company_id else None
            if company:
                notif = Notification(
                    user_id=company.employer_id,
                    type=NotificationType.NEW_APPLICATION,
                    title="Новая заявка",
                    body=f"Поступила новая заявка на вакансию {job.title}",
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
        except IntegrityError:
            await self.session.rollback()
            raise ConflictException("Вы уже откликались на эту вакансию. Повторный отклик невозможен.")


    async def cancel_application(self, worker_id: uuid.UUID, application_id: uuid.UUID) -> Application:
        application = await self.app_repo.get_with_details(application_id)
        if not application:
            raise NotFoundException("Отклик не найден")
        if application.worker_id != worker_id:
            raise ForbiddenException("Вы не можете отменить чужой отклик")

        application.status = ApplicationStatus.CANCELLED
        await self.app_repo.update(application)
        await self.session.commit()
        return application

    async def update_cover_note(self, worker_id: uuid.UUID, application_id: uuid.UUID, cover_note: str) -> Application:
        application = await self.app_repo.get_with_details(application_id)
        if not application:
            raise NotFoundException("Отклик не найден")
        if application.worker_id != worker_id:
            raise ForbiddenException("Вы не можете редактировать чужой отклик")
        if application.status != ApplicationStatus.PENDING:
            raise ConflictException("Можно редактировать только отклики в статусе 'В рассмотрении'")

        application.cover_note = cover_note
        application.cover_letter = cover_note
        await self.app_repo.update(application)
        await self.session.commit()
        return application

    async def update_application_status(
        self,
        employer_id: uuid.UUID,
        application_id: uuid.UUID,
        new_status: ApplicationStatus,
        employer_feedback: Optional[str] = None
    ) -> Application:
        application = await self.app_repo.get_with_details(application_id)
        if not application:
            raise NotFoundException("Отклик не найден")

        company = await self.company_repo.get_by_employer_id(employer_id)
        if not company:
            user_res = await self.session.execute(select(User).where(User.id == employer_id))
            user = user_res.scalars().first()
            company = Company(
                employer_id=employer_id,
                name=user.full_name or user.username or "Компания",
                is_verified=True
            )
            self.session.add(company)
            await self.session.flush()

        application.status = new_status
        if employer_feedback:
            application.employer_feedback = employer_feedback

        await self.app_repo.update(application)

        status_text_map = {
            ApplicationStatus.ACCEPTED: "Принято",
            ApplicationStatus.REJECTED: "Отклонено",
            ApplicationStatus.PENDING: "В рассмотрении",
            ApplicationStatus.CANCELLED: "Отменено"
        }
        st_name = status_text_map.get(new_status, new_status.value)
        body_text = f"Работодатель обновил статус вашей заявки на «{application.job.title}»: {st_name}."
        if employer_feedback:
            body_text += f"\nЗаметка работодателя: {employer_feedback}"

        notif = Notification(
            user_id=application.worker_id,
            type=NotificationType.STATUS_CHANGE,
            title=f"Отклик {st_name}",
            body=body_text,
            payload={
                "application_id": str(application.id),
                "job_id": str(application.job_id),
                "job_title": application.job.title,
                "status": new_status.value,
                "employer_feedback": employer_feedback or ""
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
        status_filter: Optional[ApplicationStatus] = None,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[Application], int]:
        company = await self.company_repo.get_by_employer_id(employer_id)
        if not company:
            raise NotFoundException("Компания не найдена")

        job = await self.job_repo.get_by_id(job_id)
        if not job or job.company_id != company.id:
            raise ForbiddenException("Нет прав для просмотра откликов этой вакансии")

        return await self.app_repo.get_job_applications(job_id, status_filter=status_filter, skip=skip, limit=limit)

    async def get_all_employer_applications(
        self,
        employer_id: uuid.UUID,
        status_filter: Optional[ApplicationStatus] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[Application], int]:
        return await self.app_repo.get_employer_applications(employer_id, status_filter=status_filter, skip=skip, limit=limit)
