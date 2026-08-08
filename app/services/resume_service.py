import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.domain import User, WorkerProfile, Skill, WorkerSkill, Experience, FileUpload, Resume
from app.models.enums import UserRole, ResumeStatus
from app.schemas.resume import ResumeCreateRequest, ResumeUpdateRequest, ResumeContent
from app.repositories.resume import ResumeRepository
from app.repositories.user import UserRepository
from app.services.cv_parser import CVParserService
from app.services.resume_ai import ResumeAIService
from app.core.exceptions import NotFoundException, ForbiddenException, BadRequestException

class ResumeService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = ResumeRepository(session)
        self.user_repo = UserRepository(session)

    async def get_user_resumes(self, user: User, status_filter: Optional[str] = None) -> List[Resume]:
        if user.role != UserRole.WORKER:
            raise ForbiddenException("AI Resume Builder is only accessible for Job Seekers.")
        resumes = await self.repo.get_user_resumes(user.id)
        if status_filter:
            sf = status_filter.lower().strip()
            if sf == "draft":
                return [r for r in resumes if not r.is_published]
            elif sf == "published":
                return [r for r in resumes if r.is_published]
        return resumes


    async def get_resume_by_id(self, user: User, resume_id: uuid.UUID) -> Resume:
        if user.role != UserRole.WORKER:
            raise ForbiddenException("AI Resume Builder is only accessible for Job Seekers.")
        
        resume = await self.repo.get_by_id_and_user(resume_id, user.id)
        if not resume:
            raise NotFoundException("Resume document not found")
        return resume

    async def parse_and_create_from_cv(
        self, 
        user: User, 
        file_bytes: bytes, 
        filename: str, 
        mime_type: str = "",
        source_file_id: Optional[uuid.UUID] = None
    ) -> Resume:
        if user.role != UserRole.WORKER:
            raise ForbiddenException("AI Resume Builder is only accessible for Job Seekers.")

        # 1. Parse raw text from CV file
        raw_text = CVParserService.extract_text_from_file_bytes(file_bytes, filename, mime_type)

        # Fetch user profile context if any
        user_prof = await self.user_repo.get_worker_profile(user.id)
        context = {
            "full_name": user.full_name or user.username,
            "email": user.email,
            "phone": user.phone or "",
            "city": user.city or "Душанбе",
            "desired_position": user_prof.desired_position if user_prof else "",
            "bio": user_prof.bio if user_prof else ""
        }

        # 2. Extract structured JSON via AI
        structured_content = await ResumeAIService.extract_structured_resume_from_text(raw_text, context)

        # 3. Calculate completeness and AI suggestions
        # 3. Calculate completeness and AI suggestions
        eval_data = ResumeAIService.generate_ai_suggestions(structured_content)

        # 3. Calculate completeness and AI suggestions
        eval_data = ResumeAIService.generate_ai_suggestions(structured_content)
        target_pos = structured_content.get("personal_info", {}).get("desired_position") or "Специалист"

        # 4. Sync WorkerProfile, User, Experience, and WorkerSkill records in DB
        await self._sync_worker_profile_from_resume(user.id, structured_content)

        # 5. Create Draft Resume in DB
        resume = Resume(
            user_id=user.id,
            source_file_id=source_file_id,
            title=f"Резюме: {target_pos}",
            target_position=target_pos,
            status=ResumeStatus.DRAFT,
            content=structured_content,
            ai_suggestions=eval_data,
            completeness_score=eval_data.get("completeness_score", 85),
            is_published=False
        )

        created = await self.repo.create(resume)
        await self.session.commit()
        return created

    async def create_draft_resume(self, user: User, data: ResumeCreateRequest) -> Resume:
        if user.role != UserRole.WORKER:
            raise ForbiddenException("AI Resume Builder is only accessible for Job Seekers.")

        user_prof = await self.user_repo.get_worker_profile(user.id)
        context = {
            "full_name": user.full_name or user.username,
            "username": user.username,
            "email": user.email,
            "phone": user.phone or "",
            "city": user.city or "Душанбе",
            "desired_position": data.target_position or (user_prof.desired_position if user_prof else "Специалист"),
            "bio": user_prof.bio if user_prof else ""
        }
        
        if data.content:
            default_content = data.content.dict() if hasattr(data.content, "dict") else data.content
        else:
            # Generate rich AI resume content even without an uploaded CV
            default_content = ResumeAIService._fallback_heuristic_extraction("", context)

        eval_data = ResumeAIService.generate_ai_suggestions(default_content)

        # Sync WorkerProfile, User, Experience, and WorkerSkill records in DB
        await self._sync_worker_profile_from_resume(user.id, default_content)

        resume = Resume(
            user_id=user.id,
            source_file_id=data.source_file_id,
            title=data.title or f"Резюме: {default_content.get('personal_info', {}).get('desired_position') or 'Специалист'}",
            target_position=data.target_position or default_content.get("personal_info", {}).get("desired_position") or "Специалист",
            status=ResumeStatus.DRAFT,
            content=default_content,
            ai_suggestions=eval_data,
            completeness_score=eval_data.get("completeness_score", 85),
            is_published=False
        )

        created = await self.repo.create(resume)
        await self.session.commit()
        return created

    async def update_resume(self, user: User, resume_id: uuid.UUID, data: ResumeUpdateRequest) -> Resume:
        if user.role != UserRole.WORKER:
            raise ForbiddenException("AI Resume Builder is only accessible for Job Seekers.")

        resume = await self.repo.get_by_id_and_user(resume_id, user.id)
        if not resume:
            raise NotFoundException("Resume document not found")

        if data.title is not None:
            resume.title = data.title.strip()
        if data.target_position is not None:
            resume.target_position = data.target_position.strip()
        if data.status is not None:
            resume.status = data.status

        if data.content is not None:
            content_dict = data.content.dict() if hasattr(data.content, "dict") else data.content
            resume.content = content_dict
            
            # Recalculate completeness score and AI suggestions
            eval_data = ResumeAIService.generate_ai_suggestions(content_dict)
            resume.ai_suggestions = eval_data
            resume.completeness_score = eval_data.get("completeness_score", 50)
            
            # Update target position if edited inside personal_info
            p_pos = content_dict.get("personal_info", {}).get("desired_position")
            if p_pos and not data.target_position:
                resume.target_position = p_pos

        resume.updated_at = datetime.now(timezone.utc)
        updated = await self.repo.update(resume)
        await self.session.commit()
        return updated

    async def publish_resume(self, user: User, resume_id: uuid.UUID) -> Resume:
        if user.role != UserRole.WORKER:
            raise ForbiddenException("AI Resume Builder is only accessible for Job Seekers.")

        resume = await self.repo.get_by_id_and_user(resume_id, user.id)
        if not resume:
            raise NotFoundException("Resume document not found")

        content = resume.content or {}
        p_info = content.get("personal_info") or {}

        # Comprehensive Pre-Publication Validation
        if not p_info.get("full_name") or not p_info.get("full_name").strip():
            raise BadRequestException("Укажите имя и фамилию в блоке личной информации перед публикацией.")
        if not p_info.get("desired_position") or not p_info.get("desired_position").strip():
            raise BadRequestException("Укажите желаемую должность перед публикацией резюме.")
        if not p_info.get("email") and not p_info.get("phone"):
            raise BadRequestException("Укажите хотя бы один контактный данные (email или телефон) для связи с работодателем.")


        # Unpublish any existing published resume for the user
        await self.repo.unpublish_user_resumes(user.id)

        now = datetime.now(timezone.utc)
        resume.status = ResumeStatus.PUBLISHED
        resume.is_published = True
        resume.published_at = now
        resume.updated_at = now

        # Synchronize worker's primary WorkerProfile with the published resume
        await self._sync_worker_profile_from_resume(user.id, content)

        await self.session.commit()
        return resume

    async def duplicate_resume(self, user: User, resume_id: uuid.UUID) -> Resume:
        if user.role != UserRole.WORKER:
            raise ForbiddenException("AI Resume Builder is only accessible for Job Seekers.")

        original = await self.repo.get_by_id_and_user(resume_id, user.id)
        if not original:
            raise NotFoundException("Original resume not found")

        duplicate = Resume(
            user_id=user.id,
            source_file_id=original.source_file_id,
            title=f"{original.title} (Копия)",
            target_position=original.target_position,
            status=ResumeStatus.DRAFT,
            content=original.content,
            ai_suggestions=original.ai_suggestions,
            completeness_score=original.completeness_score,
            is_published=False
        )

        created = await self.repo.create(duplicate)
        await self.session.commit()
        return created

    async def delete_resume(self, user: User, resume_id: uuid.UUID) -> bool:
        if user.role != UserRole.WORKER:
            raise ForbiddenException("AI Resume Builder is only accessible for Job Seekers.")

        resume = await self.repo.get_by_id_and_user(resume_id, user.id)
        if not resume:
            raise NotFoundException("Resume document not found")

        await self.repo.delete(resume)
        await self.session.commit()
        return True

    async def _sync_worker_profile_from_resume(self, user_id: uuid.UUID, content: Dict[str, Any]) -> None:
        """
        Synchronizes published resume sections into the user's User and WorkerProfile database records.
        """
        p_info = content.get("personal_info") or {}
        exp_list = content.get("work_experience") or []
        edu_list = content.get("education") or []
        skills = content.get("skills") or {}
        tech_skills = skills.get("technical") or []

        # Sync User top-level fields
        u_stmt = select(User).where(User.id == user_id)
        u_res = await self.session.execute(u_stmt)
        user_obj = u_res.scalar_one_or_none()
        if user_obj:
            if p_info.get("full_name"):
                user_obj.full_name = p_info.get("full_name")
            if p_info.get("phone"):
                user_obj.phone = p_info.get("phone")
            if p_info.get("city"):
                user_obj.city = p_info.get("city")
            self.session.add(user_obj)

        # Find or create WorkerProfile
        stmt = select(WorkerProfile).where(WorkerProfile.user_id == user_id)
        res = await self.session.execute(stmt)
        prof = res.scalar_one_or_none()

        if not prof:
            prof = WorkerProfile(user_id=user_id)
            self.session.add(prof)
            await self.session.flush()

        if p_info.get("desired_position"):
            prof.desired_position = p_info.get("desired_position")
        if p_info.get("summary"):
            prof.bio = p_info.get("summary")

        # Sync Education as readable formatted text
        if edu_list:
            edu_strs = []
            for item in edu_list:
                inst = item.get("institution") or "Университет"
                deg = item.get("degree") or ""
                field = item.get("field_of_study") or ""
                years = f"{item.get('start_year', '')}-{item.get('end_year', '')}".strip("-")
                edu_strs.append(f"{inst} ({deg} {field}) {years}".strip())
            prof.education = "; ".join(edu_strs)

        # Sync Work Experience records
        if exp_list:
            from sqlalchemy import delete
            await self.session.execute(delete(Experience).where(Experience.worker_profile_id == prof.id))
            for item in exp_list:
                comp = item.get("company_name") or "Компания"
                pos = item.get("position") or "Специалист"
                start = item.get("start_date") or "2022"
                end = "По настоящее время" if item.get("is_current") else (item.get("end_date") or "")
                resps = item.get("responsibilities") or []
                desc_text = "\n".join(f"• {r}" for r in resps) if isinstance(resps, list) else str(resps)
                
                exp_obj = Experience(
                    worker_profile_id=prof.id,
                    company_name=comp,
                    role_title=pos,
                    start_date=start,
                    end_date=end,
                    description=desc_text
                )
                self.session.add(exp_obj)

        # Sync Skills
        if tech_skills:
            from sqlalchemy import delete
            await self.session.execute(delete(WorkerSkill).where(WorkerSkill.worker_profile_id == prof.id))
            
            added_skill_ids = set()
            for sk_name in tech_skills[:25]:
                sk_clean = sk_name.strip()
                if not sk_clean: continue

                try:
                    sk_stmt = select(Skill).where(Skill.name.ilike(sk_clean))
                    sk_res = await self.session.execute(sk_stmt)
                    sk_obj = sk_res.scalars().first()

                    if not sk_obj:
                        sk_obj = Skill(name=sk_clean)
                        self.session.add(sk_obj)
                        await self.session.flush()

                    if sk_obj.id not in added_skill_ids:
                        added_skill_ids.add(sk_obj.id)
                        ws = WorkerSkill(worker_profile_id=prof.id, skill_id=sk_obj.id)
                        self.session.add(ws)
                except Exception as e:
                    logger.warning(f"Skipping skill sync for '{sk_clean}': {e}")
                    continue

        self.session.add(prof)
        await self.session.flush()
