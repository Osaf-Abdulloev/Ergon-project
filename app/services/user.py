import uuid
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.models.domain import User, UserSettings, WorkerProfile, Company, Experience, Certificate, Skill, WorkerSkill
from app.schemas.user import UserUpdate
from app.schemas.profile import WorkerProfileUpdate, CompanyUpdate, ExperienceCreate, CertificateCreate
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
        if update_data.full_name is not None:
            user.full_name = update_data.full_name
        if update_data.phone is not None:
            user.phone = update_data.phone
        if update_data.city is not None:
            user.city = update_data.city
        if update_data.avatar_url is not None:
            user.avatar_url = update_data.avatar_url if update_data.avatar_url != "" else None

        await self.user_repo.update(user)
        await self.session.commit()
        return user

    async def get_worker_profile(self, user_id: uuid.UUID) -> WorkerProfile:
        profile = await self.worker_repo.get_by_user_id(user_id)
        if not profile:
            profile = WorkerProfile(
                user_id=user_id,
                desired_position="",
                desired_salary=0.0,
                bio="",
                education="",
                portfolio_links={}
            )
            self.session.add(profile)
            await self.session.commit()
            profile = await self.worker_repo.get_by_user_id(user_id)
        return profile

    async def update_worker_profile(self, user_id: uuid.UUID, data: WorkerProfileUpdate) -> WorkerProfile:
        profile = await self.worker_repo.get_by_user_id(user_id)
        if not profile:
            profile = WorkerProfile(
                user_id=user_id,
                desired_position=data.desired_position or "",
                desired_salary=data.desired_salary or 0.0,
                bio=data.bio or "",
                education=data.education or "",
                portfolio_links=data.portfolio_links or {}
            )
            self.session.add(profile)
            await self.session.flush()

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
        if data.relocation_preference is not None:
            profile.relocation_preference = data.relocation_preference
        if data.commute_preference is not None:
            profile.commute_preference = data.commute_preference
        if data.work_format is not None:
            profile.work_format = data.work_format
        if data.has_driving_license is not None:
            profile.has_driving_license = data.has_driving_license
        if data.driving_categories is not None:
            profile.driving_categories = data.driving_categories
        if data.has_own_car is not None:
            profile.has_own_car = data.has_own_car

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
        profile = await self.get_worker_profile(user_id)
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

    async def add_certificate(self, user_id: uuid.UUID, cert_data: CertificateCreate) -> Certificate:
        profile = await self.get_worker_profile(user_id)
        cert = Certificate(
            worker_profile_id=profile.id,
            title=cert_data.title,
            issuer=cert_data.issuer,
            year=cert_data.year,
            credential_url=cert_data.credential_url
        )
        self.session.add(cert)
        await self.session.commit()
        return cert

    async def delete_certificate(self, user_id: uuid.UUID, cert_id: uuid.UUID) -> None:
        profile = await self.get_worker_profile(user_id)
        stmt = delete(Certificate).where(Certificate.id == cert_id, Certificate.worker_profile_id == profile.id)
        await self.session.execute(stmt)
        await self.session.commit()

    async def get_user_settings(self, user_id: uuid.UUID) -> UserSettings:
        stmt = select(UserSettings).where(UserSettings.user_id == user_id)
        res = await self.session.execute(stmt)
        settings_obj = res.scalar_one_or_none()
        if not settings_obj:
            settings_obj = UserSettings(
                user_id=user_id,
                language="ru",
                timezone="Asia/Dushanbe",
                email_notifications=True,
                push_notifications=True,
                theme="light"
            )
            self.session.add(settings_obj)
            await self.session.commit()
        return settings_obj

    async def update_user_settings(self, user_id: uuid.UUID, data: dict) -> UserSettings:
        settings_obj = await self.get_user_settings(user_id)
        if "language" in data:
            settings_obj.language = data["language"]
        if "timezone" in data:
            settings_obj.timezone = data["timezone"]
        if "email_notifications" in data:
            settings_obj.email_notifications = bool(data["email_notifications"])
        if "push_notifications" in data:
            settings_obj.push_notifications = bool(data["push_notifications"])
        if "theme" in data:
            settings_obj.theme = data["theme"]
        if "extra_preferences" in data:
            settings_obj.extra_preferences = data["extra_preferences"]

        await self.session.commit()
        return settings_obj

    async def get_company_profile(self, employer_id: uuid.UUID) -> Company:
        company = await self.company_repo.get_by_employer_id(employer_id)
        if not company:
            user = await self.user_repo.get_by_id(employer_id)
            company = Company(
                employer_id=employer_id,
                company_name=user.full_name or user.username or "Компания",
                is_verified=True
            )
            self.session.add(company)
            await self.session.commit()
        return company

    async def update_company_profile(self, employer_id: uuid.UUID, data: CompanyUpdate) -> Company:
        company = await self.get_company_profile(employer_id)
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
        if data.address is not None:
            company.address = data.address
        if data.contact_email is not None:
            company.contact_email = data.contact_email
        if data.contact_phone is not None:
            company.contact_phone = data.contact_phone
        if data.employee_count is not None:
            company.employee_count = data.employee_count

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
