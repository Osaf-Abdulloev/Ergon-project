from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.schemas.user import UserOut, UserUpdate
from app.schemas.profile import WorkerProfileOut, WorkerProfileUpdate, CompanyOut, CompanyUpdate, ExperienceOut, ExperienceCreate
from app.schemas.common import PaginatedResponse
from app.services.user import UserService
from app.auth.deps import get_current_user, require_roles
from app.models.domain import User
from app.models.enums import UserRole

router = APIRouter(prefix="/users", tags=["Users & Profiles"])

@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserOut)
async def update_me(data: UserUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    service = UserService(db)
    return await service.update_user(current_user.id, data)

@router.get("/me/worker-profile", response_model=WorkerProfileOut)
async def get_my_worker_profile(current_user: User = Depends(require_roles([UserRole.WORKER])), db: AsyncSession = Depends(get_db)):
    service = UserService(db)
    return await service.get_worker_profile(current_user.id)

@router.put("/me/worker-profile", response_model=WorkerProfileOut)
async def update_my_worker_profile(data: WorkerProfileUpdate, current_user: User = Depends(require_roles([UserRole.WORKER])), db: AsyncSession = Depends(get_db)):
    service = UserService(db)
    return await service.update_worker_profile(current_user.id, data)

@router.post("/me/experience", response_model=ExperienceOut, status_code=status.HTTP_201_CREATED)
async def add_experience(data: ExperienceCreate, current_user: User = Depends(require_roles([UserRole.WORKER])), db: AsyncSession = Depends(get_db)):
    service = UserService(db)
    return await service.add_experience(current_user.id, data)

@router.get("/me/company-profile", response_model=CompanyOut)
async def get_my_company_profile(current_user: User = Depends(require_roles([UserRole.EMPLOYER])), db: AsyncSession = Depends(get_db)):
    service = UserService(db)
    return await service.get_company_profile(current_user.id)

@router.put("/me/company-profile", response_model=CompanyOut)
async def update_my_company_profile(data: CompanyUpdate, current_user: User = Depends(require_roles([UserRole.EMPLOYER])), db: AsyncSession = Depends(get_db)):
    service = UserService(db)
    return await service.update_company_profile(current_user.id, data)

@router.get("/workers", response_model=PaginatedResponse[WorkerProfileOut])
async def search_workers(
    name: Optional[str] = None,
    skill: Optional[str] = None,
    city: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    service = UserService(db)
    skip = (page - 1) * limit
    items, total = await service.search_workers(name=name, skill=skill, city=city, skip=skip, limit=limit)
    pages = (total + limit - 1) // limit if total > 0 else 1
    return PaginatedResponse(items=items, total=total, page=page, limit=limit, pages=pages)
