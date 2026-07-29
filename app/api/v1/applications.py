import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.schemas.application import ApplicationCreate, ApplicationStatusUpdate, ApplicationOut
from app.schemas.common import PaginatedResponse
from app.services.application import ApplicationService
from app.auth.deps import get_current_user, require_roles
from app.models.domain import User
from app.models.enums import UserRole

router = APIRouter(tags=["Applications"])

@router.post("/applications", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
async def apply_to_job(
    data: ApplicationCreate,
    current_user: User = Depends(require_roles([UserRole.WORKER])),
    db: AsyncSession = Depends(get_db)
):
    service = ApplicationService(db)
    return await service.apply_to_job(current_user.id, data)

@router.get("/applications/my", response_model=PaginatedResponse[ApplicationOut])
async def get_my_applications(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(require_roles([UserRole.WORKER])),
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
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(require_roles([UserRole.EMPLOYER])),
    db: AsyncSession = Depends(get_db)
):
    service = ApplicationService(db)
    skip = (page - 1) * limit
    items, total = await service.get_job_applications(current_user.id, job_id, skip=skip, limit=limit)
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
    return await service.update_application_status(current_user.id, application_id, data.status)
