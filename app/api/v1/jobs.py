import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.schemas.job import JobCreate, JobUpdate, JobOut
from app.schemas.common import PaginatedResponse, MessageResponse
from app.services.job import JobService
from app.auth.deps import get_current_user, require_roles, require_verified_user
from app.models.domain import User
from app.models.enums import UserRole, EmploymentType, JobStatus

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.post("", response_model=JobOut, status_code=status.HTTP_201_CREATED)
async def create_job(
    data: JobCreate,
    current_user: User = Depends(require_roles([UserRole.EMPLOYER])),
    db: AsyncSession = Depends(get_db)
):
    service = JobService(db)
    return await service.create_job(current_user.id, data)

@router.get("", response_model=PaginatedResponse[JobOut])
async def search_jobs(
    title: Optional[str] = None,
    category: Optional[str] = None,
    location: Optional[str] = None,
    employment_type: Optional[EmploymentType] = None,
    salary_min: Optional[float] = None,
    salary_max: Optional[float] = None,
    status: Optional[JobStatus] = JobStatus.OPEN,
    company_id: Optional[uuid.UUID] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    service = JobService(db)
    skip = (page - 1) * limit
    items, total = await service.search_jobs(
        title=title,
        category=category,
        location=location,
        employment_type=employment_type,
        salary_min=salary_min,
        salary_max=salary_max,
        status=status,
        company_id=company_id,
        skip=skip,
        limit=limit
    )
    pages = (total + limit - 1) // limit if total > 0 else 1
    return PaginatedResponse(items=items, total=total, page=page, limit=limit, pages=pages)

@router.get("/{job_id}", response_model=JobOut)
async def get_job(job_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    service = JobService(db)
    return await service.get_job_by_id(job_id)

@router.put("/{job_id}", response_model=JobOut)
async def update_job(
    job_id: uuid.UUID,
    data: JobUpdate,
    current_user: User = Depends(require_roles([UserRole.EMPLOYER])),
    db: AsyncSession = Depends(get_db)
):
    service = JobService(db)
    return await service.update_job(current_user.id, job_id, data)

@router.delete("/{job_id}", response_model=MessageResponse)
async def delete_job(
    job_id: uuid.UUID,
    current_user: User = Depends(require_roles([UserRole.EMPLOYER])),
    db: AsyncSession = Depends(get_db)
):
    service = JobService(db)
    await service.delete_job(current_user.id, job_id)
    return MessageResponse(message="Job deleted successfully")
