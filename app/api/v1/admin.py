import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.database.session import get_db
from app.schemas.profile import CompanyOut
from app.schemas.common import MessageResponse
from app.auth.deps import require_roles
from app.models.domain import User, Company, Job, Application
from app.models.enums import UserRole
from app.repositories.profile import CompanyRepository
from app.core.exceptions import NotFoundException

router = APIRouter(prefix="/admin", tags=["Admin Portal"])

@router.patch("/companies/{company_id}/verify", response_model=CompanyOut)
async def verify_company(
    company_id: uuid.UUID,
    admin: User = Depends(require_roles([UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db)
):
    repo = CompanyRepository(db)
    company = await repo.get_by_id(company_id)
    if not company:
        raise NotFoundException("Company not found")
    
    company.is_verified = True
    await repo.update(company)
    await db.commit()
    return company

@router.get("/analytics")
async def get_analytics(
    admin: User = Depends(require_roles([UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db)
):
    users_count = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    companies_count = (await db.execute(select(func.count()).select_from(Company))).scalar_one()
    jobs_count = (await db.execute(select(func.count()).select_from(Job))).scalar_one()
    apps_count = (await db.execute(select(func.count()).select_from(Application))).scalar_one()

    return {
        "total_users": users_count,
        "total_companies": companies_count,
        "total_jobs": jobs_count,
        "total_applications": apps_count
    }
