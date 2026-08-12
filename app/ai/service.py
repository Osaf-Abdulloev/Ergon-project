import os
import abc
import random
import httpx
from typing import Dict, Any, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.ai.tools import AITools
from app.ai.key_manager import AIKeyManager


class BaseAIProvider(abc.ABC):
    @abc.abstractmethod
    async def generate_response(
        self, 
        prompt: str, 
        context: Optional[Dict[str, Any]] = None,
        history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        pass

class GroqAIProvider(BaseAIProvider):
    def __init__(self, tools: AITools):
        self.tools = tools

    async def generate_response(
        self, 
        prompt: str, 
        context: Optional[Dict[str, Any]] = None,
        history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        url = "https://api.groq.com/openai/v1/chat/completions"
        user_name = context.get("full_name") or context.get("email") if context else None
        name_str = f" User name: {user_name}." if user_name else ""

        user_prof = (context or {}).get("user_profile") or {}
        prof_info = ""
        if user_prof and isinstance(user_prof, dict):
            pos = user_prof.get("position") or ""
            skills = ", ".join(user_prof.get("skills") or [])
            loc = user_prof.get("location") or ""
            bio = user_prof.get("bio") or ""
            prof_info = f"\nUser Saved Profile Data:\n- Target Position: {pos}\n- Key Skills: {skills}\n- Preferred Location: {loc}\n- Bio/Experience: {bio}\n"

        # Fetch ALL open jobs from platform database (all 537+ real vacancies)
        jobs_text = ""
        total_vacancies_count = 0
        try:
            db_jobs = await self.tools.search_jobs(title="", limit=1000)
            total_vacancies_count = len(db_jobs)
            if db_jobs:
                # Rank jobs by relevance to user's profile and prompt
                prompt_lower = (prompt or "").lower()
                user_pos_lower = (user_prof.get("position") or "").lower() if isinstance(user_prof, dict) else ""
                user_skills = [s.lower() for s in (user_prof.get("skills") or [])] if isinstance(user_prof, dict) else []

                def get_relevance(j):
                    score = 0
                    t_low = j['title'].lower()
                    d_low = (j.get('description') or '').lower()

                    if user_pos_lower and user_pos_lower in t_low:
                        score += 50
                    for sk in user_skills:
                        if sk in t_low or sk in d_low:
                            score += 20
                    for word in prompt_lower.split():
                        if len(word) >= 3:
                            if word in t_low:
                                score += 15
                            if word in d_low:
                                score += 5
                    return score

                sorted_jobs = sorted(db_jobs, key=get_relevance, reverse=True)
                top_grounded_jobs = sorted_jobs[:45]

                job_list_str = []
                for j in top_grounded_jobs:
                    sal = f" (зарплата: {j['salary_min']} TJS)" if j.get('salary_min') else ""
                    comp = j.get('company') or "Работодатель"
                    job_list_str.append(f"• \"{j['title']}\" — {comp}, {j['location']}{sal}")
                jobs_text = f"\nTotal active vacancies in database: {total_vacancies_count}. Top matched vacancies from database:\n" + "\n".join(job_list_str)
        except Exception as e:
            logger.error(f"Error loading all jobs for AI context: {e}")

        system_prompt = (
            f"You are HamKor AI, an expert career AI assistant on the HamKor job search platform in Tajikistan.{name_str}\n"
            f"YOU HAVE DIRECT ACCESS TO ALL {total_vacancies_count} REAL VACANCIES IN THE HAMKOR DATABASE.\n"
            f"{prof_info}\n"
            f"{jobs_text}\n"
            "CRITICAL INSTRUCTIONS:\n"
            f"1. You have FULL ACCESS to ALL {total_vacancies_count} real vacancies currently published on HamKor and full access to the user's profile.\n"
            "2. When the user asks for 'вакансии по профилю', recommended jobs, or any role search, analyze their skills and match them against the 537+ database vacancies above.\n"
            "3. Explicitly state the match score (e.g., '🎯 98% Подходит по вашим навыкам') and explain why these jobs fit their profile!\n"
            "4. ALWAYS wrap exact job titles in double quotes like \"Менеджер по закупкам\" or \"Фронтенд разработчик\" so the frontend turns them into clickable buttons.\n"
            "5. Respond in polite, helpful Russian or Tajik."
        )

        # Check if user prompt requests applying for a job ("откликнись на", "подай заявку", "отправить отклик", "отклик")
        prompt_lower = (prompt or "").lower()
        if any(w in prompt_lower for w in ["откликнись", "откликнуться", "подай заявку", "подай отклик", "подать отклик", "подать заявку", "отправить отклик", "отправь отклик"]):
            user_id = context.get("user_id") if context else None
            if user_id:
                try:
                    db_jobs = await self.tools.search_jobs(title="", limit=1000)
                    matched_job = None

                    # 1. Direct title match
                    for j in db_jobs:
                        t_low = j["title"].lower()
                        if t_low in prompt_lower:
                            matched_job = j
                            break

                    # 2. Word substring match
                    if not matched_job:
                        words = [w for w in prompt_lower.split() if len(w) >= 3 and w not in ["откликнись", "откликнуться", "подай", "подать", "заявку", "отклик", "вакансию", "на", "мне", "пожалуйста", "лучшую", "подходящую"]]
                        for j in db_jobs:
                            t_low = j["title"].lower()
                            if any(word in t_low for word in words):
                                matched_job = j
                                break

                    # 3. Best profile match fallback if user said "откликнись на лучшую" or no specific title
                    if not matched_job and db_jobs:
                        user_pos_lower = (user_prof.get("position") or "").lower() if isinstance(user_prof, dict) else ""
                        user_skills = [s.lower() for s in (user_prof.get("skills") or [])] if isinstance(user_prof, dict) else []
                        
                        def score_job(j):
                            s = 0
                            t_low = j['title'].lower()
                            if user_pos_lower and user_pos_lower in t_low: s += 50
                            for sk in user_skills:
                                if sk in t_low or sk in (j.get('description') or '').lower(): s += 20
                            return s
                        
                        sorted_j = sorted(db_jobs, key=score_job, reverse=True)
                        if sorted_j:
                            matched_job = sorted_j[0]

                    if matched_job:
                        import uuid
                        from app.services.application import ApplicationService
                        from app.schemas.application import ApplicationCreate
                        app_service = ApplicationService(self.tools.session)
                        cover_note = f"Здравствуйте! ИИ-консультант HamKor AI отправил автоматический отклик соискателя на вакансию '{matched_job['title']}'. Опыт и профессиональные навыки соискателя полностью соответствуют квалификационным требованиям."
                        
                        try:
                            sal_val = matched_job.get("salary_min")
                            sal_str = f"{sal_val} TJS" if sal_val else "Договорная"
                            
                            await app_service.apply_to_job(uuid.UUID(user_id), ApplicationCreate(job_id=uuid.UUID(matched_job["id"]), cover_note=cover_note))
                            return (
                                f"✅ **Отклик успешно отправлен!**\n\n"
                                f"HamKor AI сформировал сопроводительное письмо и подал заявку на вакансию **\"{matched_job['title']}\"**\n"
                                f"🏢 **Компания:** {matched_job.get('company', 'Работодатель')}\n"
                                f"📍 **Локация:** {matched_job.get('location', 'Таджикистан')}\n"
                                f"💰 **Зарплата:** {sal_str}\n\n"
                                f"Статус заявки: **На рассмотрении**. Уведомление отправлено работодателю!"
                            )

                        except Exception as app_err:
                            err_str = str(app_err)
                            if "already" in err_str.lower() or "существует" in err_str.lower() or "отклик" in err_str.lower():
                                return f"ℹ️ Вы уже отправляли отклик на вакансию **\"{matched_job['title']}\"**. Вы можете отслеживать статус вашей заявки в разделе «Отклики»."
                            raise app_err
                except Exception as ex:
                    logger.error(f"AI application error: {ex}")
            else:
                return "Чтобы я мог автоматически отправить отклик на вакансию, пожалуйста, войдите в свой аккаунт соискателя на платформе."

        user_role = (context or {}).get("role", "worker")
        user_id = (context or {}).get("user_id")

        # Handle Employer AI Recruiter Actions
        if user_role == "employer" and user_id:
            prompt_lower = (prompt or "").lower()

            # Employer Action 1: Accept Candidate
            if any(w in prompt_lower for w in ["прими ", "принять ", "одобри ", "одобрить "]):
                try:
                    emp_apps = await self.tools.get_employer_applications(user_id)
                    matched_app = None
                    for a in emp_apps:
                        c_name = a["candidate_name"].lower()
                        j_title = a["job_title"].lower()
                        if c_name in prompt_lower or any(word in c_name for word in prompt_lower.split() if len(word) >= 3):
                            matched_app = a
                            break
                        if j_title in prompt_lower:
                            matched_app = a
                            break

                    if not matched_app and emp_apps:
                        pending_apps = [a for a in emp_apps if a["status"] == "pending"]
                        if pending_apps:
                            matched_app = pending_apps[0]

                    if matched_app:
                        res = await self.tools.accept_application_by_ai(user_id, matched_app["application_id"])
                        return (
                            f"✅ **Отклик кандидата успешно принят!**\n\n"
                            f"👤 **Кандидат:** {matched_app['candidate_name']}\n"
                            f"💼 **Должность:** {matched_app['desired_position']}\n"
                            f"📋 **Вакансия:** \"{matched_app['job_title']}\"\n\n"
                            f"Кандидату отправлено уведомление и email. Теперь вы можете написать кандидату в чате!"
                        )
                except Exception as ex:
                    logger.error(f"AI accept application error: {ex}")

            # Employer Action 2: Reject Candidate
            if any(w in prompt_lower for w in ["отклони ", "отклонить "]):
                try:
                    emp_apps = await self.tools.get_employer_applications(user_id)
                    matched_app = None
                    for a in emp_apps:
                        c_name = a["candidate_name"].lower()
                        if c_name in prompt_lower or any(word in c_name for word in prompt_lower.split() if len(word) >= 3):
                            matched_app = a
                            break

                    if not matched_app and emp_apps:
                        pending_apps = [a for a in emp_apps if a["status"] == "pending"]
                        if pending_apps:
                            matched_app = pending_apps[0]

                    if matched_app:
                        res = await self.tools.reject_application_by_ai(user_id, matched_app["application_id"])
                        return (
                            f"❌ **Отклик кандидата отклонён.**\n\n"
                            f"👤 **Кандидат:** {matched_app['candidate_name']}\n"
                            f"📋 **Вакансия:** \"{matched_app['job_title']}\"\n\n"
                            f"Уведомление и письмо об отклонении отправлены кандидату."
                        )
                except Exception as ex:
                    logger.error(f"AI reject application error: {ex}")

            # Employer Action 3: Review / List Applications
            if any(w in prompt_lower for w in ["отклик", "кандидат", "заявк", "кто откликнулся", "покажи подходящих"]):
                try:
                    emp_apps = await self.tools.get_employer_applications(user_id)
                    if not emp_apps:
                        return "По вашим вакансиям пока нет поступивших откликов от кандидатов."

                    lines = [f"📊 **Поступившие отклики на ваши вакансии (всего: {len(emp_apps)}):**\n"]
                    for a in emp_apps[:10]:
                        skills_str = ", ".join(a["skills"][:4]) if a["skills"] else "не указаны"
                        st_icon = "⏳" if a["status"] == "pending" else ("✅" if a["status"] == "accepted" else "❌")
                        lines.append(
                            f"{st_icon} **{a['candidate_name']}** — {a['desired_position']}\n"
                            f"   • Вакансия: \"{a['job_title']}\"\n"
                            f"   • Навыки: {skills_str}\n"
                            f"   • Статус: {a['status']}\n"
                        )
                    lines.append("\nВы можете попросить меня: *«Прими кандидата [Имя]»* или *«Отклони кандидата [Имя]»*.")
                    return "\n".join(lines)
                except Exception as ex:
                    logger.error(f"AI list applications error: {ex}")

        messages_payload = [{"role": "system", "content": system_prompt}]
        
        if history:
            for item in history[-6:]:
                role = "assistant" if item.get("role") in ["assistant", "ai"] else "user"
                content = item.get("content") or ""
                if content.strip():
                    messages_payload.append({"role": role, "content": content})

        messages_payload.append({"role": "user", "content": prompt})

        res = await AIKeyManager.generate_completion(messages_payload, json_mode=False, temperature=0.4, max_tokens=1200)
        if res and res.strip():
            return res.strip()

        return await DynamicFallbackAIProvider(self.tools).generate_response(prompt, context, history)


class DynamicFallbackAIProvider(BaseAIProvider):
    def __init__(self, tools: AITools):
        self.tools = tools

    async def generate_response(
        self, 
        prompt: str, 
        context: Optional[Dict[str, Any]] = None,
        history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        p_lower = (prompt or "").lower().strip()
        user_name = context.get("full_name") if context else None
        greeting_name = f", {user_name}" if user_name else ""

        try:
            db_jobs = await self.tools.search_jobs(title="", limit=10)
            if db_jobs:
                matched_job = db_jobs[0]
                return f"Привет{greeting_name}! Я подобрал подходящие вакансии в базе данных HamKor. Например: **\"{matched_job['title']}\"** ({matched_job.get('company', 'Работодатель')}, {matched_job.get('location', 'Таджикистан')}). Нажмите на название вакансии или попросите: *«Откликнись на вакансию {matched_job['title']}»*!"
        except Exception:
            pass

        return f"Привет{greeting_name}! Я ваш карьерный ИИ-ассистент на платформе HamKor. Напишите вашу желаемую должность или попросите меня откликнуться на подходящие вакансии!"

class AIService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.tools = AITools(session)
        self.provider: BaseAIProvider = GroqAIProvider(self.tools)

    async def process_user_query(
        self, 
        prompt: str, 
        context: Optional[Dict[str, Any]] = None,
        history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        return await self.provider.generate_response(prompt, context, history)

