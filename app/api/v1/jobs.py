import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from app.database.session import get_db
from app.schemas.job import JobCreate, JobUpdate, JobOut
from app.schemas.common import PaginatedResponse, MessageResponse
from app.services.job import JobService
from app.auth.deps import get_current_user, get_current_user_optional, require_roles, require_verified_user
from app.models.domain import User, SavedJob, Job
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
    sort_by_match: bool = Query(default=True),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=1000),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    service = JobService(db)
    skip = (page - 1) * limit

    # Load candidate profile & published resume for real-time backend scanning
    worker_profile = None
    published_resume = None
    if current_user:
        from app.repositories.profile import WorkerProfileRepository
        from app.repositories.resume import ResumeRepository
        wp_repo = WorkerProfileRepository(db)
        res_repo = ResumeRepository(db)
        worker_profile = await wp_repo.get_by_user_id(current_user.id)
        published_resume = await res_repo.get_user_published_resume(current_user.id)

    # Fetch matching jobs from repo (fetch extra if sorting by match across whole catalog)
    fetch_limit = limit * 5 if (sort_by_match and current_user) else limit
    items, total = await service.search_jobs(
        title=title,
        category=category,
        location=location,
        employment_type=employment_type,
        salary_min=salary_min,
        salary_max=salary_max,
        status=status,
        company_id=company_id,
        skip=0 if sort_by_match else skip,
        limit=fetch_limit if sort_by_match else limit
    )

    # Fetch user's submitted application job IDs if authenticated
    applied_job_ids = set()
    if current_user:
        from app.models.domain import Application
        app_res = await db.execute(
            select(Application.job_id).where(Application.worker_id == current_user.id)
        )
        applied_job_ids = set(app_res.scalars().all())

    # Compute real-time backend AI match score and travel logistics for each job
    from app.services.match_service import JobMatchService
    annotated_items = []
    for job in items:
        eval_data = JobMatchService.evaluate_job_match(job, worker_profile, current_user, published_resume)
        job_dict = JobOut.model_validate(job).model_dump()
        job_dict.update({
            "match_score": eval_data["match_score"],
            "commute_estimate": eval_data["commute_estimate"],
            "distance_estimate": eval_data["distance_estimate"],
            "matched_reasons": eval_data["matched_reasons"],
            "matched_skills": eval_data["matched_skills"],
            "has_applied": job.id in applied_job_ids,
        })
        annotated_items.append(job_dict)


    if sort_by_match and current_user:
        annotated_items.sort(key=lambda x: x.get("match_score", 0), reverse=True)
        annotated_items = annotated_items[skip : skip + limit]

    pages = (total + limit - 1) // limit if total > 0 else 1
    return PaginatedResponse(items=annotated_items, total=total, page=page, limit=limit, pages=pages)

@router.get("/my", response_model=PaginatedResponse[JobOut])
async def get_my_created_jobs(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(require_roles([UserRole.EMPLOYER])),
    db: AsyncSession = Depends(get_db)
):
    service = JobService(db)
    skip = (page - 1) * limit
    items, total = await service.get_my_jobs(current_user.id, skip=skip, limit=limit)
    pages = (total + limit - 1) // limit if total > 0 else 1
    return PaginatedResponse(items=items, total=total, page=page, limit=limit, pages=pages)

@router.get("/saved/my", response_model=PaginatedResponse[JobOut])
async def get_my_saved_jobs(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Job)
        .join(SavedJob, SavedJob.job_id == Job.id)
        .options(selectinload(Job.company))
        .where(SavedJob.user_id == current_user.id)
        .order_by(SavedJob.created_at.desc())
    )
    res = await db.execute(stmt)
    jobs = res.scalars().all()
    total = len(jobs)
    paginated = jobs[(page - 1) * limit : page * limit]
    pages = (total + limit - 1) // limit if total > 0 else 1
    return PaginatedResponse(items=paginated, total=total, page=page, limit=limit, pages=pages)

@router.post("/{job_id}/save", response_model=MessageResponse)
async def save_job_to_bookmarks(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(SavedJob).where(SavedJob.user_id == current_user.id, SavedJob.job_id == job_id)
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()
    if not existing:
        saved_job = SavedJob(user_id=current_user.id, job_id=job_id)
        db.add(saved_job)
        await db.commit()
    return MessageResponse(message="Job saved to bookmarks in PostgreSQL")

@router.delete("/{job_id}/save", response_model=MessageResponse)
async def remove_job_from_bookmarks(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = delete(SavedJob).where(SavedJob.user_id == current_user.id, SavedJob.job_id == job_id)
    await db.execute(stmt)
    await db.commit()
    return MessageResponse(message="Job removed from bookmarks in PostgreSQL")

@router.get("/{job_id}/match")
async def evaluate_job_match_for_user(
    job_id: uuid.UUID,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    service = JobService(db)
    job = await service.get_job_by_id(job_id)

    worker_profile = None
    published_resume = None

    if current_user:
        from app.repositories.profile import WorkerProfileRepository
        from app.repositories.resume import ResumeRepository
        wp_repo = WorkerProfileRepository(db)
        res_repo = ResumeRepository(db)
        worker_profile = await wp_repo.get_by_user_id(current_user.id)
        published_resume = await res_repo.get_user_published_resume(current_user.id)

    from app.services.match_service import JobMatchService
    return JobMatchService.evaluate_job_match(job, worker_profile, current_user, published_resume)

@router.get("/{job_id}/commute")
async def calculate_job_commute(
    job_id: uuid.UUID,
    origin_address: Optional[str] = Query(default=None),
    origin_lat: Optional[float] = Query(default=None),
    origin_lng: Optional[float] = Query(default=None),
    transport_mode: str = Query(default="car"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    service = JobService(db)
    job = await service.get_job_by_id(job_id)
    
    user_location = origin_address or (current_user.city if current_user else None) or "Душанбе"
    is_remote = (job.employment_type.value if hasattr(job.employment_type, 'value') else str(job.employment_type)) == 'remote'
    
    from app.services.location_service import LocationService
    return LocationService.calculate_commute(
        origin_location=user_location,
        destination_location=job.location,
        origin_lat=origin_lat,
        origin_lng=origin_lng,
        transport_mode=transport_mode,
        is_remote=is_remote
    )

@router.get("/{job_id}", response_model=JobOut)
async def get_job(
    job_id: uuid.UUID,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    service = JobService(db)
    job = await service.get_job_by_id(job_id)
    job_dict = JobOut.model_validate(job).model_dump()
    if current_user:
        from app.models.domain import Application
        app_res = await db.execute(
            select(Application.id).where(Application.worker_id == current_user.id, Application.job_id == job_id)
        )
        job_dict["has_applied"] = app_res.scalar_one_or_none() is not None
    return job_dict


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

@router.post("/sync/yora")
async def sync_yora_jobs(
    max_pages: Optional[int] = Query(default=None, ge=1, description="Max pages to fetch, default fetches all"),
    db: AsyncSession = Depends(get_db)
):
    from app.services.yora_parser import YoraParserService
    parser = YoraParserService(db)
    stats = await parser.fetch_and_sync(max_pages=max_pages)
    return {
        "status": "success",
        "source": "yora.tj",
        "stats": stats
    }

@router.post("/sync/somon")
async def sync_somon_jobs(
    max_pages: int = Query(default=10, ge=1, le=100, description="Max pages to fetch from Somon.tj"),
    db: AsyncSession = Depends(get_db)
):
    from app.services.somon_parser import SomonParserService
    parser = SomonParserService(db)
    stats = await parser.fetch_and_sync(max_pages=max_pages)
    return {
        "status": "success",
        "source": "somon.tj",
        "stats": stats
    }

