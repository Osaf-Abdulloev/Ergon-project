import os
import json
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete

from app.models.domain import (
    User, WorkerProfile, Experience, Certificate, Skill, WorkerSkill, 
    CVDocument, ProfileAISuggestion, ProfileChangeHistory, Resume, FileUpload
)
from app.models.enums import ResumeStatus, UserRole
from app.schemas.cv import CVAnalysisResultSchema, ProposedFieldChange
from app.services.document_extractor import DocumentExtractorService
from app.ai.key_manager import AIKeyManager
from app.core.config import settings
from app.utils.storage import storage_service
from app.core.exceptions import NotFoundException, BadRequestException, ForbiddenException

logger = logging.getLogger(__name__)

class CVProcessingService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def upload_and_queue_cv(
        self, 
        user: User, 
        file_bytes: bytes, 
        filename: str, 
        mime_type: str = ""
    ) -> CVDocument:
        if user.role != UserRole.WORKER:
            raise ForbiddenException("CV Processing is strictly restricted to Job Seekers (Workers).")

        ext = os.path.splitext(filename)[1].lower()
        allowed_exts = [".pdf", ".docx", ".doc", ".png", ".jpg", ".jpeg", ".webp", ".txt"]
        if ext not in allowed_exts:
            raise BadRequestException(f"Unsupported file type '{ext}'. Allowed types: PDF, DOCX, PNG, JPG, TXT.")

        file_size_mb = len(file_bytes) / (1024 * 1024)
        if file_size_mb > settings.MAX_UPLOAD_SIZE_MB:
            raise BadRequestException(f"File size ({file_size_mb:.1f}MB) exceeds maximum limit of {settings.MAX_UPLOAD_SIZE_MB}MB.")

        # Save original document to storage
        random_filename = f"{uuid.uuid4().hex}{ext}"
        folder_path = os.path.join(settings.FILE_STORAGE_PATH, "cv_documents")
        os.makedirs(folder_path, exist_ok=True)
        full_path = os.path.join(folder_path, random_filename)
        with open(full_path, "wb") as f:
            f.write(file_bytes)

        storage_rel_path = f"cv_documents/{random_filename}"
        file_url = f"/api/v1/files/{storage_rel_path}"

        # Create FileUpload record
        db_file = FileUpload(
            user_id=user.id,
            original_filename=filename,
            stored_filename=random_filename,
            folder="cv_documents",
            mime_type=mime_type or "application/octet-stream",
            file_size=len(file_bytes),
            storage_path=storage_rel_path,
            url=file_url
        )
        self.session.add(db_file)
        await self.session.flush()

        # Create CVDocument record
        cv_doc = CVDocument(
            user_id=user.id,
            file_upload_id=db_file.id,
            original_filename=filename,
            file_type=ext.lstrip("."),
            mime_type=mime_type or "application/octet-stream",
            file_size=len(file_bytes),
            storage_path=storage_rel_path,
            processing_status="UPLOADED"
        )
        self.session.add(cv_doc)
        await self.session.commit()
        await self.session.refresh(cv_doc)

        # Dispatch background Celery task
        try:
            from app.celery.tasks import process_cv_document_task
            process_cv_document_task.delay(str(cv_doc.id))
        except Exception as e:
            logger.warning(f"Could not dispatch Celery task asynchronously ({e}); running process synchronously.")
            # Run synchronously if Celery broker is unavailable
            await self.process_cv_document(cv_doc.id)

        return cv_doc

    async def process_cv_document(self, cv_document_id: uuid.UUID) -> CVDocument:
        stmt = select(CVDocument).where(CVDocument.id == cv_document_id)
        res = await self.session.execute(stmt)
        cv_doc = res.scalar_one_or_none()
        if not cv_doc:
            raise NotFoundException("CVDocument not found")

        try:
            # 1. Status -> EXTRACTING
            cv_doc.processing_status = "EXTRACTING"
            await self.session.commit()

            # Read file bytes
            full_path = os.path.join(settings.FILE_STORAGE_PATH, cv_doc.storage_path)
            if not os.path.exists(full_path):
                raise NotFoundException("CV File not found on disk storage")

            with open(full_path, "rb") as f:
                file_bytes = f.read()

            # 2. Extract Text
            extracted_text, method = DocumentExtractorService.extract_text(
                file_bytes, cv_doc.original_filename, cv_doc.mime_type
            )
            cv_doc.extracted_text = extracted_text
            cv_doc.extraction_method = method
            cv_doc.processing_status = "EXTRACTED"
            await self.session.commit()

            if not extracted_text or len(extracted_text.strip()) < 10:
                cv_doc.processing_status = "FAILED"
                cv_doc.processing_error = "Could not extract any readable text from document. Ensure document is not password-protected or empty."
                await self.session.commit()
                return cv_doc

            # 3. Status -> ANALYZING (AI Structured Extraction)
            cv_doc.processing_status = "ANALYZING"
            await self.session.commit()

            # Fetch user profile context for accuracy
            u_stmt = select(User).where(User.id == cv_doc.user_id)
            u_res = await self.session.execute(u_stmt)
            user_obj = u_res.scalar_one_or_none()

            from sqlalchemy.orm import selectinload
            p_stmt = select(WorkerProfile).options(
                selectinload(WorkerProfile.worker_skills).selectinload(WorkerSkill.skill)
            ).where(WorkerProfile.user_id == cv_doc.user_id)
            p_res = await self.session.execute(p_stmt)
            worker_prof = p_res.scalar_one_or_none()

            context = {
                "full_name": user_obj.full_name or user_obj.username if user_obj else "",
                "email": user_obj.email if user_obj else "",
                "phone": user_obj.phone or "" if user_obj else "",
                "city": user_obj.city or "" if user_obj else "",
                "desired_position": worker_prof.desired_position if worker_prof else ""
            }

            extracted_data = await self._analyze_cv_with_ai(extracted_text, context)

            cv_doc.extracted_data = extracted_data
            cv_doc.processing_status = "ANALYZED"
            cv_doc.processed_at = datetime.now(timezone.utc)
            await self.session.commit()

            # 4. Generate Profile AISuggestion record
            await self._generate_profile_suggestions(user_obj, worker_prof, cv_doc, extracted_data)

            # 5. Generate Draft Resume from extracted facts
            await self._generate_draft_resume(cv_doc.user_id, cv_doc.id, extracted_data)

            cv_doc.processing_status = "PROFILE_REVIEW_REQUIRED"
            await self.session.commit()
            return cv_doc

        except Exception as e:
            logger.error(f"CV Processing Error for ID {cv_document_id}: {e}", exc_info=True)
            cv_doc.processing_status = "FAILED"
            cv_doc.processing_error = str(e)
            await self.session.commit()
            return cv_doc

    async def _analyze_cv_with_ai(self, raw_text: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extracts 100% real factual information from CV text via AI with JSON mode and Pydantic validation.
        """
        system_prompt = (
            "You are an expert AI Principal Resume Architect and Executive CV Parser.\n"
            "Your task is to perform an EXACT, FACTUAL, 100% TRUTHFUL EXTRACTION of all real information from the provided CV document text.\n\n"
            "STRICT EXTRACTION RULES:\n"
            "1. Output ONLY a valid JSON object matching the requested schema.\n"
            "2. NEVER INVENT DATA. Do not fabricate salary, dates, companies, education degrees, or skills not explicitly present in the text.\n"
            "3. If a field is missing from the CV, output null or an empty array [].\n"
            "4. Thoroughly extract personal contact info, full name, phone, email, location/city/country, desired position, desired salary (number), work format (remote/office/hybrid), employment type, skills (technical, soft, frameworks, databases, tools), work experience (company, position, start_date, end_date, is_current, responsibilities, achievements), education, certificates, projects, languages (name, proficiency), and social links (linkedin, github, gitlab, portfolio, website, telegram).\n"
            "5. JSON SCHEMA:\n"
            "{\n"
            '  "personal_info": {"full_name": null, "first_name": null, "last_name": null, "middle_name": null, "email": null, "phone": null, "location": null, "city": null, "country": null, "desired_position": null, "desired_salary": null, "salary_currency": "TJS", "work_format": null, "employment_type": null, "summary": null},\n'
            '  "work_experience": [{"company_name": "str", "position": "str", "start_date": "str", "end_date": null, "is_current": false, "responsibilities": ["str"], "achievements": ["str"], "location": null}],\n'
            '  "education": [{"institution": "str", "degree": "str", "field_of_study": null, "start_year": null, "end_year": null, "location": null}],\n'
            '  "skills": {"technical": ["str"], "soft": ["str"], "frameworks": ["str"], "databases": ["str"], "tools": ["str"], "languages": ["str"]},\n'
            '  "languages": [{"name": "str", "proficiency": "Native"}],\n'
            '  "certificates": [{"title": "str", "issuer": "str", "year": null, "credential_url": null}],\n'
            '  "projects": [{"name": "str", "description": null, "tech_stack": [], "link": null}],\n'
            '  "social_links": {"linkedin": null, "github": null, "gitlab": null, "portfolio": null, "telegram": null, "website": null},\n'
            '  "interests": []\n'
            "}\n"
        )

        user_prompt = (
            f"Candidate Context: {json.dumps(context, ensure_ascii=False)}\n\n"
            f"FULL CV TEXT TO PARSE AND EXTRACT:\n{raw_text[:25000]}"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        res_str = await AIKeyManager.generate_completion(messages, json_mode=True, temperature=0.0, max_tokens=4000)
        if res_str:
            try:
                parsed_json = json.loads(res_str)
                # Validate against Pydantic schema
                validated = CVAnalysisResultSchema(**parsed_json)
                return validated.model_dump()
            except Exception as e:
                logger.warning(f"AI JSON validation error: {e}. Cleaning and re-validating...")

        # Fallback heuristic parser if AI fails or is unreachable
        from app.services.resume_ai import ResumeAIService
        fallback_data = ResumeAIService._fallback_heuristic_extraction(raw_text, context)
        validated = CVAnalysisResultSchema(
            personal_info=fallback_data.get("personal_info", {}),
            work_experience=fallback_data.get("work_experience", []),
            education=fallback_data.get("education", []),
            skills=fallback_data.get("skills", {}),
            languages=fallback_data.get("languages", []),
            certificates=fallback_data.get("certificates", []),
            projects=fallback_data.get("projects", []),
            social_links=fallback_data.get("social_links", {}),
            interests=[]
        )
        return validated.model_dump()

    async def _generate_profile_suggestions(
        self, 
        user: Optional[User], 
        worker_prof: Optional[WorkerProfile], 
        cv_doc: CVDocument, 
        extracted_data: Dict[str, Any]
    ) -> ProfileAISuggestion:
        p_info = extracted_data.get("personal_info") or {}
        skills = extracted_data.get("skills") or {}
        soc = extracted_data.get("social_links") or {}
        exp_list = extracted_data.get("work_experience") or []
        edu_list = extracted_data.get("education") or []

        changes: List[ProposedFieldChange] = []

        # 1. Full Name
        cv_name = p_info.get("full_name")
        curr_name = user.full_name if user else None
        if cv_name and cv_name.strip() and cv_name.strip() != (curr_name or "").strip():
            changes.append(ProposedFieldChange(
                category="basic", field_name="full_name", field_label="Полное имя",
                current_value=curr_name, proposed_value=cv_name.strip()
            ))

        # 2. Phone
        cv_phone = p_info.get("phone")
        curr_phone = user.phone if user else None
        if cv_phone and cv_phone.strip() and cv_phone.strip() != (curr_phone or "").strip():
            changes.append(ProposedFieldChange(
                category="contact", field_name="phone", field_label="Телефон",
                current_value=curr_phone, proposed_value=cv_phone.strip()
            ))

        # 3. City / Location
        cv_city = p_info.get("city") or p_info.get("location")
        curr_city = user.city if user else None
        if cv_city and cv_city.strip() and cv_city.strip() != (curr_city or "").strip():
            changes.append(ProposedFieldChange(
                category="basic", field_name="city", field_label="Город",
                current_value=curr_city, proposed_value=cv_city.strip()
            ))

        # 4. Desired Position
        cv_pos = p_info.get("desired_position")
        curr_pos = worker_prof.desired_position if worker_prof else None
        if cv_pos and cv_pos.strip() and cv_pos.strip() != (curr_pos or "").strip():
            changes.append(ProposedFieldChange(
                category="position", field_name="desired_position", field_label="Желаемая должность",
                current_value=curr_pos, proposed_value=cv_pos.strip()
            ))

        # 5. Desired Salary
        cv_sal = p_info.get("desired_salary")
        curr_sal = worker_prof.desired_salary if worker_prof else None
        if cv_sal and isinstance(cv_sal, (int, float)) and cv_sal > 0 and cv_sal != curr_sal:
            changes.append(ProposedFieldChange(
                category="position", field_name="desired_salary", field_label="Желаемая зарплата",
                current_value=curr_sal, proposed_value=cv_sal
            ))

        # 6. Bio / Professional Summary
        cv_summary = p_info.get("summary")
        curr_bio = worker_prof.bio if worker_prof else None
        if cv_summary and cv_summary.strip() and cv_summary.strip() != (curr_bio or "").strip():
            changes.append(ProposedFieldChange(
                category="basic", field_name="bio", field_label="О себе / Резюме",
                current_value=curr_bio, proposed_value=cv_summary.strip()
            ))

        # 7. Work Format
        cv_wf = p_info.get("work_format")
        curr_wf = worker_prof.work_format if worker_prof else None
        if cv_wf and cv_wf.strip() and cv_wf.strip() != (curr_wf or "").strip():
            changes.append(ProposedFieldChange(
                category="position", field_name="work_format", field_label="Формат работы",
                current_value=curr_wf, proposed_value=cv_wf.strip()
            ))

        # 8. Skills
        cv_skills = list(dict.fromkeys((skills.get("technical") or []) + (skills.get("soft") or [])))
        curr_skills = [s.name for s in (worker_prof.skills if worker_prof else [])]
        if cv_skills and set(cv_skills) != set(curr_skills):
            changes.append(ProposedFieldChange(
                category="skills", field_name="skills", field_label="Профессиональные навыки",
                current_value=curr_skills, proposed_value=cv_skills
            ))

        # 9. Portfolio Links (GitHub, LinkedIn, Portfolio, Telegram, Website)
        curr_links = worker_prof.portfolio_links if worker_prof and worker_prof.portfolio_links else {}
        cv_links = {
            "github": soc.get("github") or soc.get("gitlab") or curr_links.get("github"),
            "linkedin": soc.get("linkedin") or curr_links.get("linkedin"),
            "portfolio": soc.get("portfolio") or curr_links.get("portfolio"),
            "telegram": soc.get("telegram") or curr_links.get("telegram"),
            "website": soc.get("website") or curr_links.get("website")
        }
        cv_links = {k: v for k, v in cv_links.items() if v}
        if cv_links and cv_links != curr_links:
            changes.append(ProposedFieldChange(
                category="links", field_name="portfolio_links", field_label="Ссылки и соцсети",
                current_value=curr_links, proposed_value=cv_links
            ))

        # 10. Experiences
        if exp_list:
            changes.append(ProposedFieldChange(
                category="experience", field_name="experiences", field_label="Опыт работы",
                current_value=None, proposed_value=exp_list
            ))

        # Delete existing pending suggestions for this CV
        del_stmt = delete(ProfileAISuggestion).where(
            ProfileAISuggestion.cv_document_id == cv_doc.id,
            ProfileAISuggestion.status == "PENDING"
        )
        await self.session.execute(del_stmt)

        suggestion = ProfileAISuggestion(
            user_id=cv_doc.user_id,
            cv_document_id=cv_doc.id,
            status="PENDING",
            suggested_changes=[c.model_dump() for c in changes]
        )
        self.session.add(suggestion)
        await self.session.commit()
        return suggestion

    async def _generate_draft_resume(self, user_id: uuid.UUID, cv_doc_id: uuid.UUID, extracted_data: Dict[str, Any]) -> Resume:
        p_info = extracted_data.get("personal_info") or {}
        pos = p_info.get("desired_position") or "Специалист"

        resume = Resume(
            user_id=user_id,
            source_cv_id=cv_doc_id,
            title=f"Резюме из CV: {pos}",
            target_position=pos,
            status=ResumeStatus.DRAFT,
            content=extracted_data,
            completeness_score=85,
            is_published=False,
            is_default=False
        )
        self.session.add(resume)
        await self.session.commit()
        return resume

    async def confirm_profile_suggestions(
        self, 
        user: User, 
        suggestion_id: uuid.UUID, 
        accepted_fields: List[str], 
        custom_overrides: Optional[Dict[str, Any]] = None
    ) -> ProfileAISuggestion:
        stmt = select(ProfileAISuggestion).where(
            ProfileAISuggestion.id == suggestion_id,
            ProfileAISuggestion.user_id == user.id
        )
        res = await self.session.execute(stmt)
        suggestion = res.scalar_one_or_none()
        if not suggestion:
            raise NotFoundException("ProfileAISuggestion not found")

        custom_map = custom_overrides or {}
        changes_list = suggestion.suggested_changes or []

        u_stmt = select(User).where(User.id == user.id)
        u_res = await self.session.execute(u_stmt)
        user_obj = u_res.scalar_one_or_none()

        p_stmt = select(WorkerProfile).where(WorkerProfile.user_id == user.id)
        p_res = await self.session.execute(p_stmt)
        worker_prof = p_res.scalar_one_or_none()
        if not worker_prof:
            worker_prof = WorkerProfile(user_id=user.id)
            self.session.add(worker_prof)
            await self.session.flush()

        updated_changes = []
        for change in changes_list:
            field_name = change.get("field_name")
            if field_name in accepted_fields:
                val_to_apply = custom_map.get(field_name, change.get("proposed_value"))
                prev_val = change.get("current_value")

                # Apply update based on field_name
                if field_name == "full_name" and val_to_apply:
                    user_obj.full_name = str(val_to_apply)
                elif field_name == "phone" and val_to_apply:
                    user_obj.phone = str(val_to_apply)
                elif field_name == "city" and val_to_apply:
                    user_obj.city = str(val_to_apply)
                elif field_name == "desired_position" and val_to_apply:
                    worker_prof.desired_position = str(val_to_apply)
                elif field_name == "desired_salary" and val_to_apply:
                    try: worker_prof.desired_salary = float(val_to_apply)
                    except ValueError: pass
                elif field_name == "bio" and val_to_apply:
                    worker_prof.bio = str(val_to_apply)
                elif field_name == "work_format" and val_to_apply:
                    worker_prof.work_format = str(val_to_apply)
                elif field_name == "portfolio_links" and isinstance(val_to_apply, dict):
                    worker_prof.portfolio_links = val_to_apply
                elif field_name == "skills" and isinstance(val_to_apply, list):
                    await self.session.execute(delete(WorkerSkill).where(WorkerSkill.worker_profile_id == worker_prof.id))
                    for sk_name in val_to_apply:
                        sk_clean = sk_name.strip()
                        if not sk_clean: continue
                        sk_stmt = select(Skill).where(Skill.name.ilike(sk_clean))
                        sk_res = await self.session.execute(sk_stmt)
                        sk_obj = sk_res.scalars().first()
                        if not sk_obj:
                            sk_obj = Skill(name=sk_clean)
                            self.session.add(sk_obj)
                            await self.session.flush()
                        ws = WorkerSkill(worker_profile_id=worker_prof.id, skill_id=sk_obj.id)
                        self.session.add(ws)
                elif field_name == "experiences" and isinstance(val_to_apply, list):
                    await self.session.execute(delete(Experience).where(Experience.worker_profile_id == worker_prof.id))
                    for item in val_to_apply:
                        if isinstance(item, dict):
                            resps = item.get("responsibilities") or []
                            desc_text = "\n".join(f"• {r}" for r in resps) if isinstance(resps, list) else str(resps)
                            exp_obj = Experience(
                                worker_profile_id=worker_prof.id,
                                company_name=item.get("company_name") or "Компания",
                                role_title=item.get("position") or "Специалист",
                                start_date=item.get("start_date") or "2022",
                                end_date="По настоящее время" if item.get("is_current") else (item.get("end_date") or ""),
                                description=desc_text
                            )
                            self.session.add(exp_obj)

                # Record in Audit History
                history_entry = ProfileChangeHistory(
                    user_id=user.id,
                    field_name=field_name,
                    previous_value={"val": prev_val},
                    new_value={"val": val_to_apply},
                    source="CV_AI",
                    confirmed_by=user.id
                )
                self.session.add(history_entry)
                change["status"] = "accepted"
            else:
                change["status"] = "rejected"

            updated_changes.append(change)

        suggestion.suggested_changes = updated_changes
        suggestion.status = "ACCEPTED" if len(accepted_fields) == len(changes_list) else "PARTIALLY_ACCEPTED"
        suggestion.reviewed_at = datetime.now(timezone.utc)

        # Update CVDocument processing_status to COMPLETED
        cv_stmt = select(CVDocument).where(CVDocument.id == suggestion.cv_document_id)
        cv_res = await self.session.execute(cv_stmt)
        cv_doc = cv_res.scalar_one_or_none()
        if cv_doc:
            cv_doc.processing_status = "COMPLETED"

        await self.session.commit()
        return suggestion
