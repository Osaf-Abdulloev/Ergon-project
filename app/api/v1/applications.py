import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.schemas.application import ApplicationCreate, ApplicationStatusUpdate, ApplicationOut, ApplicationCoverNoteUpdate
from app.schemas.common import PaginatedResponse
from app.services.application import ApplicationService
from app.auth.deps import get_current_user, require_roles
from app.models.domain import User
from app.models.enums import UserRole, ApplicationStatus

router = APIRouter(tags=["Applications"])

@router.post("/applications", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
async def apply_to_job(
    data: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = ApplicationService(db)
    app_res = await service.apply_to_job(current_user.id, data)

    # Dispatch real-time notifications
    from app.services.notification_service import NotificationService
    from app.models.enums import NotificationType
    from app.repositories.job import JobRepository

    job_repo = JobRepository(db)
    job = await job_repo.get_by_id(data.job_id)
    job_title = job.title if job else "вакансию"

    # Worker confirmation notification
    await NotificationService.send_notification(
        db,
        current_user.id,
        "Отклик успешно отправлен",
        f"Ваш отклик на вакансию '{job_title}' успешно отправлен работодателю.",
        type=NotificationType.STATUS_CHANGE
    )

    # Employer notification if company exists
    if job and job.company and job.company.employer_id:
        await NotificationService.send_notification(
            db,
            job.company.employer_id,
            "Новый отклик на вакансию",
            f"Соискатель {current_user.full_name or current_user.username} откликнулся на вашу вакансию '{job_title}'.",
            type=NotificationType.NEW_APPLICATION
        )

    return app_res

@router.get("/applications/check/{job_id}")
async def check_application_status(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = ApplicationService(db)
    existing = await service.app_repo.get_by_worker_and_job(current_user.id, job_id)
    return {
        "has_applied": existing is not None,
        "application_id": str(existing.id) if existing else None,
        "status": existing.status.value if existing and hasattr(existing.status, 'value') else (str(existing.status) if existing else None)
    }

@router.post("/applications/{application_id}/cancel", response_model=ApplicationOut)
async def cancel_application(
    application_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = ApplicationService(db)
    return await service.cancel_application(current_user.id, application_id)

@router.patch("/applications/{application_id}/cover-note", response_model=ApplicationOut)
async def update_cover_note(
    application_id: uuid.UUID,
    data: ApplicationCoverNoteUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = ApplicationService(db)
    return await service.update_cover_note(current_user.id, application_id, data.cover_note)

@router.get("/applications/my", response_model=PaginatedResponse[ApplicationOut])
async def get_my_applications(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = ApplicationService(db)
    skip = (page - 1) * limit
    items, total = await service.get_worker_applications(current_user.id, skip=skip, limit=limit)
    pages = (total + limit - 1) // limit if total > 0 else 1
    return PaginatedResponse(items=items, total=total, page=page, limit=limit, pages=pages)

@router.get("/jobs/{job_id}/applications", response_model=PaginatedResponse[ApplicationOut])
async def get_job_applications(
    job_id: uuid.UUID,
    status_filter: Optional[ApplicationStatus] = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(require_roles([UserRole.EMPLOYER])),
    db: AsyncSession = Depends(get_db)
):
    service = ApplicationService(db)
    skip = (page - 1) * limit
    items, total = await service.get_job_applications(current_user.id, job_id, status_filter=status_filter, skip=skip, limit=limit)
    pages = (total + limit - 1) // limit if total > 0 else 1
    return PaginatedResponse(items=items, total=total, page=page, limit=limit, pages=pages)

@router.get("/applications/employer", response_model=PaginatedResponse[ApplicationOut])
async def get_employer_applications_all(
    job_id: Optional[uuid.UUID] = Query(default=None),
    status_filter: Optional[ApplicationStatus] = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(require_roles([UserRole.EMPLOYER])),
    db: AsyncSession = Depends(get_db)
):
    service = ApplicationService(db)
    skip = (page - 1) * limit
    if job_id:
        items, total = await service.get_job_applications(current_user.id, job_id, status_filter=status_filter, skip=skip, limit=limit)
    else:
        items, total = await service.get_all_employer_applications(current_user.id, status_filter=status_filter, skip=skip, limit=limit)
    pages = (total + limit - 1) // limit if total > 0 else 1
    return PaginatedResponse(items=items, total=total, page=page, limit=limit, pages=pages)

@router.patch("/applications/{application_id}/status", response_model=ApplicationOut)
async def update_application_status(
    application_id: uuid.UUID,
    data: ApplicationStatusUpdate,
    current_user: User = Depends(require_roles([UserRole.EMPLOYER])),
    db: AsyncSession = Depends(get_db)
):
    service = ApplicationService(db)
    updated_app = await service.update_application_status(
        current_user.id,
        application_id,
        data.status,
        employer_feedback=data.employer_feedback,
        rejection_reason=data.rejection_reason,
        rating=data.rating
    )

    # Notify applicant about status update
    from app.services.notification_service import NotificationService
    from app.models.enums import NotificationType
    
    status_ru_map = {
        "accepted": "Принят",
        "rejected": "Отклонен",
        "pending": "В рассмотрении",
        "cancelled": "Отменен"
    }
    status_val = data.status.value if hasattr(data.status, "value") else str(data.status)
    status_ru = status_ru_map.get(status_val, status_val)
    msg_body = f"Работодатель обновил статус вашего отклика на '{status_ru}'."
    if data.employer_feedback:
        msg_body += f"\nПримечание: {data.employer_feedback}"

    await NotificationService.send_notification(
        db,
        updated_app.worker_id,
        f"Отклик: {status_ru}",
        msg_body,
        type=NotificationType.STATUS_CHANGE
    )

    return updated_app

@router.post("/applications/{application_id}/contact")
async def contact_candidate(
    application_id: uuid.UUID,
    current_user: User = Depends(require_roles([UserRole.EMPLOYER])),
    db: AsyncSession = Depends(get_db)
):
    service = ApplicationService(db)
    chat = await service.contact_candidate(current_user.id, application_id)
    return {
        "status": "success",
        "chat_id": str(chat.id),
        "message": "Чат с кандидатом успешно открыт"
    }
