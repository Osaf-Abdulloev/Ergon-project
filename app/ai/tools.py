import uuid
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.job import JobService
from app.services.user import UserService
from app.models.enums import EmploymentType, JobStatus

class AITools:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.job_service = JobService(session)
        self.user_service = UserService(session)

    async def search_jobs(
        self,
        title: Optional[str] = None,
        category: Optional[str] = None,
        location: Optional[str] = None,
        salary_min: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        jobs, _ = await self.job_service.search_jobs(
            title=title,
            category=category,
            location=location,
            salary_min=salary_min,
            status=JobStatus.OPEN,
            limit=10
        )
        return [
            {
                "id": str(j.id),
                "title": j.title,
                "category": j.category,
                "location": j.location,
                "salary_min": j.salary_min,
                "salary_max": j.salary_max,
                "company": j.company.company_name if j.company else None
            }
            for j in jobs
        ]

    async def search_workers(
        self,
        name: Optional[str] = None,
        skill: Optional[str] = None,
        city: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        workers, _ = await self.user_service.search_workers(name=name, skill=skill, city=city, limit=10)
        return [
            {
                "id": str(w.user_id),
                "username": w.user.username if w.user else None,
                "desired_position": w.desired_position,
                "skills": [ws.skill.name for ws in w.worker_skills if ws.skill]
            }
            for w in workers
        ]

    async def get_user_profile(self, user_id_str: str) -> Dict[str, Any]:
        user_id = uuid.UUID(user_id_str)
        user = await self.user_service.get_user_profile(user_id)
        res = {
            "id": str(user.id),
            "email": user.email,
            "username": user.username,
            "role": user.role.value,
            "city": user.city
        }
        if user.worker_profile:
            res["worker_profile"] = {
                "desired_position": user.worker_profile.desired_position,
                "desired_salary": user.worker_profile.desired_salary,
                "bio": user.worker_profile.bio,
                "skills": [ws.skill.name for ws in user.worker_profile.worker_skills if ws.skill]
            }
        elif user.company:
            res["company_profile"] = {
                "company_name": user.company.company_name,
                "industry": user.company.industry,
                "description": user.company.description
            }
        return res

    async def analyze_resume(self, resume_text: str) -> Dict[str, Any]:
        skills_found = []
        common_skills = ["Python", "FastAPI", "PostgreSQL", "React", "Docker", "Git", "SQL", "Management", "Sales"]
        for s in common_skills:
            if s.lower() in resume_text.lower():
                skills_found.append(s)

        score = min(100, len(skills_found) * 20 + 30)
        return {
            "score": score,
            "detected_skills": skills_found,
            "feedback": "Strong resume structure. Consider highlighting measurable project impact and technical stack metrics."
        }

    async def recommend_jobs(self, user_id_str: str) -> List[Dict[str, Any]]:
        user_id = uuid.UUID(user_id_str)
        profile = await self.user_service.get_worker_profile(user_id)
        title = profile.desired_position or ""
        return await self.search_jobs(title=title)

    async def recommend_candidates(self, employer_id_str: str) -> List[Dict[str, Any]]:
        return await self.search_workers(limit=10)
