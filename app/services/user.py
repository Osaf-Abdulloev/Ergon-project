import uuid
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.domain import User, WorkerProfile, Company, Experience, Skill, WorkerSkill
from app.schemas.user import UserUpdate
from app.schemas.profile import WorkerProfileUpdate, CompanyUpdate, ExperienceCreate
from app.repositories.user import UserRepository
from app.repositories.profile import WorkerProfileRepository, CompanyRepository, SkillRepository
from app.core.exceptions import NotFoundException, ForbiddenException

class UserService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)
        self.worker_repo = WorkerProfileRepository(session)
        self.company_repo = CompanyRepository(session)
        self.skill_repo = SkillRepository(session)

    async def get_user_profile(self, user_id: uuid.UUID) -> User:
        user = await self.user_repo.get_with_profile(user_id)
        if not user:
            raise NotFoundException("User not found")
        return user

    async def update_user(self, user_id: uuid.UUID, update_data: UserUpdate) -> User:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException("User not found")

        if update_data.username is not None:
            user.username = update_data.username
        if update_data.phone is not None:
            user.phone = update_data.phone
        if update_data.city is not None:
            user.city = update_data.city
        if update_data.avatar_url is not None:
            user.avatar_url = update_data.avatar_url

        await self.user_repo.update(user)
        await self.session.commit()
        return user

    async def get_worker_profile(self, user_id: uuid.UUID) -> WorkerProfile:
        profile = await self.worker_repo.get_by_user_id(user_id)
        if not profile:
            raise NotFoundException("Worker profile not found")
        return profile

    async def update_worker_profile(self, user_id: uuid.UUID, data: WorkerProfileUpdate) -> WorkerProfile:
        profile = await self.worker_repo.get_by_user_id(user_id)
        if not profile:
            raise NotFoundException("Worker profile not found")

        if data.desired_position is not None:
            profile.desired_position = data.desired_position
        if data.desired_salary is not None:
            profile.desired_salary = data.desired_salary
        if data.bio is not None:
            profile.bio = data.bio
        if data.education is not None:
            profile.education = data.education
        if data.portfolio_links is not None:
            profile.portfolio_links = data.portfolio_links

        if data.skills is not None:
            profile.worker_skills.clear()
            for skill_name in data.skills:
                skill = await self.skill_repo.get_or_create(skill_name)
                ws = WorkerSkill(worker_profile_id=profile.id, skill_id=skill.id)
                profile.worker_skills.append(ws)

        await self.worker_repo.update(profile)
        await self.session.commit()
        return await self.get_worker_profile(user_id)

    async def add_experience(self, user_id: uuid.UUID, exp_data: ExperienceCreate) -> Experience:
        profile = await self.worker_repo.get_by_user_id(user_id)
        if not profile:
            raise NotFoundException("Worker profile not found")

        exp = Experience(
            worker_profile_id=profile.id,
            company_name=exp_data.company_name,
            role_title=exp_data.role_title,
            start_date=exp_data.start_date,
            end_date=exp_data.end_date,
            description=exp_data.description
        )
        self.session.add(exp)
        await self.session.commit()
        return exp

    async def get_company_profile(self, employer_id: uuid.UUID) -> Company:
        company = await self.company_repo.get_by_employer_id(employer_id)
        if not company:
            raise NotFoundException("Company profile not found")
        return company

    async def update_company_profile(self, employer_id: uuid.UUID, data: CompanyUpdate) -> Company:
        company = await self.company_repo.get_by_employer_id(employer_id)
        if not company:
            raise NotFoundException("Company profile not found")

        if data.company_name is not None:
            company.company_name = data.company_name
        if data.description is not None:
            company.description = data.description
        if data.logo_url is not None:
            company.logo_url = data.logo_url
        if data.website is not None:
            company.website = data.website
        if data.industry is not None:
            company.industry = data.industry

        await self.company_repo.update(company)
        await self.session.commit()
        return company

    async def search_workers(
        self,
        name: Optional[str] = None,
        skill: Optional[str] = None,
        city: Optional[str] = None,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[WorkerProfile], int]:
        return await self.worker_repo.search_workers(name=name, skill=skill, city=city, skip=skip, limit=limit)
