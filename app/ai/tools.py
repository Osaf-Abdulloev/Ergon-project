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
        salary_min: Optional[float] = None,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        jobs, _ = await self.job_service.search_jobs(
            title=title,
            category=category,
            location=location,
            salary_min=salary_min,
            status=JobStatus.OPEN,
            limit=limit
        )
        return [
            {
                "id": str(j.id),
                "title": j.title,
                "category": j.category,
                "location": j.location,
                "salary_min": j.salary_min,
                "salary_max": j.salary_max,
                "currency": j.currency or "TJS",
                "company": j.external_company_name or (j.company.company_name if j.company else "Работодатель HamKor"),
                "description": j.description or ""
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

    async def analyze_candidate_profile(self, user_profile: Dict[str, Any]) -> Dict[str, Any]:
        position = (user_profile.get("position") or user_profile.get("desired_position") or "").strip()
        skills = user_profile.get("skills") or []
        location = (user_profile.get("location") or "Душанбе").strip()
        bio = (user_profile.get("bio") or "").strip()
        expected_sal = float(user_profile.get("expected_salary") or user_profile.get("desired_salary") or 0)

        # 1. Health & Completeness Score
        health = 30
        strengths = []
        tips = []

        if position:
            health += 20
            strengths.append(f"Указана целевая должность: {position}")
        else:
            tips.append("Укажите целевую должность для прицельного подбора вакансий (+20%)")

        if len(skills) >= 3:
            health += 25
            strengths.append(f"Добавлено {len(skills)} ключевых навыков")
        elif len(skills) > 0:
            health += 12
            tips.append("Добавьте еще хотя бы 3-5 ключевых навыков (+13%)")
        else:
            tips.append("Добавьте список ключевых навыков для расчёта совпадения по вакансиям (+25%)")

        if bio and len(bio) > 20:
            health += 15
            strengths.append("Содержательное описание опыта и биография")
        else:
            tips.append("Опишите ваш практический опыт и достижения в био (+15%)")

        if expected_sal > 0:
            health += 10
            strengths.append(f"Указаны зарплатные ожидания ({expectedSal:,.0f} TJS)".replace(",", " "))
        else:
            tips.append("Укажите ожидаемую заработную плату для точного отбора по бюджету (+10%)")

        health_score = float(min(100, health))

        overall_rating = "Высокая конкурентоспособность" if health_score >= 80 else "Средний уровень профиля" if health_score >= 50 else "Требуется доработка профиля"

        # 2. Database Job Matching
        all_jobs = await self.search_jobs(limit=1000)
        
        pos_lower = position.lower()
        skills_lower = [s.lower() for s in skills]

        SKILLS_BY_CAT = {
            "it": ["React", "JavaScript", "TypeScript", "Python", "FastAPI", "PostgreSQL", "Docker", "Git", "HTML/CSS", "Tailwind", "Figma"],
            "procurement": ["Закупки", "Переговоры", "Снабжение", "Тендеры", "ВЭД", "Логистика", "Поставщики", "1С: Склад"],
            "hr": ["Подбор персонала", "Рекрутинг", "Кадровое делопроизводство", "KPI", "Обучение", "Собеседования"],
            "finance": ["Бухгалтерский учет", "1С: Бухгалтерия", "Налоги", "Финансовый анализ", "Отчетность"],
            "sales": ["B2B Продажи", "Переговоры", "CRM", "Работа с клиентами", "Холодные звонки"],
            "legal": ["Юриспруденция", "Договорное право", "Претензионная работа", "Консультирование"]
        }

        cat_key = "it"
        if "закуп" in pos_lower or "снабжен" in pos_lower: cat_key = "procurement"
        elif "hr" in pos_lower or "кадр" in pos_lower or "персонал" in pos_lower: cat_key = "hr"
        elif "бухгалтер" in pos_lower or "учет" in pos_lower: cat_key = "finance"
        elif "продаж" in pos_lower or "менеджер" in pos_lower: cat_key = "sales"
        elif "юрист" in pos_lower or "право" in pos_lower: cat_key = "legal"

        matched_jobs_eval = []
        missing_skills_counter = {}

        for j in all_jobs:
            j_title = j["title"].lower()
            j_desc = j["description"].lower()
            j_loc = j["location"].lower()

            pos_score = 10.0
            if pos_lower and (pos_lower in j_title or j_title in pos_lower):
                pos_score = 30.0
            elif any(k in j_title or k in j_desc for k in ["закуп", "разработ", "hr", "бухгалтер", "юрист", "продаж"]):
                pos_score = 25.0

            sk_score = 10.0
            m_skills = []
            for sk in skills:
                sk_l = sk.lower()
                if sk_l and (sk_l in j_title or sk_l in j_desc):
                    sk_score += 8.0
                    m_skills.append(sk)
            sk_score = min(35.0, sk_score)

            missing_for_this_job = []
            for ref_sk in SKILLS_BY_CAT.get(cat_key, SKILLS_BY_CAT["it"]):
                ref_l = ref_sk.lower()
                if (ref_l in j_title or ref_l in j_desc) and not any(ref_l in s for s in skills_lower):
                    missing_for_this_job.append(ref_sk)
                    missing_skills_counter[ref_sk] = missing_skills_counter.get(ref_sk, 0) + 1

            sal_score = 12.0
            j_sal = j.get("salary_min") or 0
            if expected_sal > 0 and j_sal > 0:
                if j_sal >= expected_sal * 0.9:
                    sal_score = 15.0
                elif j_sal >= expected_sal * 0.75:
                    sal_score = 11.0
                else:
                    sal_score = 6.0

            loc_score = 10.0
            if "удал" in j_desc or j.get("employment_type") == "remote":
                loc_score = 15.0
            elif location.lower() in j_loc:
                loc_score = 15.0

            total_m = min(99.0, max(40.0, pos_score + sk_score + sal_score + loc_score + 4.0))

            reasons = []
            if pos_score >= 25: reasons.append(f"Совпадение сферы: {position or j['title']}")
            if m_skills: reasons.append(f"Совпали навыки: {', '.join(m_skills[:3])}")
            if loc_score == 15.0: reasons.append("Удобная локация / формат работы")

            growth = []
            if missing_for_this_job:
                growth.append(f"Добавление навыка '{missing_for_this_job[0]}' повысит совпадение на +12%")

            matched_jobs_eval.append({
                "job_id": j["id"],
                "title": j["title"],
                "company": j["company"],
                "location": j["location"],
                "salary": f"{j['salary_min']} {j.get('currency', 'TJS')}" if j.get("salary_min") else "По договоренности",
                "match_score": total_m,
                "breakdown": {
                    "position_score": pos_score,
                    "skill_score": sk_score,
                    "salary_score": sal_score,
                    "location_score": loc_score,
                    "completeness_score": 4.0
                },
                "matched_skills": m_skills,
                "missing_skills": missing_for_this_job[:3],
                "match_reasons": reasons[:3],
                "growth_advice": growth
            })

        matched_jobs_eval.sort(key=lambda x: x["match_score"], reverse=True)
        top_recommended = matched_jobs_eval[:5]

        # Top missing in demand skills
        sorted_missing = sorted(missing_skills_counter.items(), key=lambda x: x[1], reverse=True)
        missing_in_demand = [item[0] for item in sorted_missing[:4]]

        if not missing_in_demand:
            missing_in_demand = [s for s in SKILLS_BY_CAT.get(cat_key, []) if s.lower() not in skills_lower][:3]

        # Salary assessment
        sal_msg = "Зарплатные ожидания соответствуют текущим предложениям на платформе HamKor."
        if expected_sal > 0:
            avg_sal = sum(j.get("salary_min") or 0 for j in all_jobs if j.get("salary_min")) / max(1, len([j for j in all_jobs if j.get("salary_min")]))
            if expected_sal > avg_sal * 1.5:
                sal_msg = f"Ваши ожидания ({expected_sal:,.0f} TJS) выше среднерыночных на HamKor (~{avg_sal:,.0f} TJS). Обоснуйте их в био через ключевые достижения.".replace(",", " ")
            elif expected_sal < avg_sal * 0.7:
                sal_msg = f"Ваши ожидания ({expected_sal:,.0f} TJS) ниже рынка. Вы можете претендовать на вилку ~{avg_sal:,.0f} TJS.".replace(",", " ")

        return {
            "health_score": health_score,
            "overall_rating": overall_rating,
            "key_strengths": strengths,
            "missing_in_demand_skills": missing_in_demand,
            "salary_assessment": sal_msg,
            "recommended_jobs": top_recommended,
            "actionable_tips": tips if tips else ["Ваш профиль в отличном состоянии! Регулярно обновляйте список реализованных проектов."]
        }

    async def recommend_jobs(self, user_id_str: str) -> List[Dict[str, Any]]:
        user_id = uuid.UUID(user_id_str)
        profile = await self.user_service.get_worker_profile(user_id)
        if not profile:
            return await self.search_jobs(limit=10)
        
        prof_dict = {
            "position": profile.desired_position or "",
            "skills": [ws.skill.name for ws in profile.worker_skills if ws.skill],
            "bio": profile.bio or "",
            "expected_salary": profile.desired_salary or 0
        }
        res = await self.analyze_candidate_profile(prof_dict)
        return [r for r in res.get("recommended_jobs", [])]

    async def recommend_candidates(self, employer_id_str: str) -> List[Dict[str, Any]]:
        return await self.search_workers(limit=10)

    async def get_employer_applications(self, employer_id_str: str, job_id_str: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch real job applications for employer's jobs with strict permission enforcement."""
        from app.services.application import ApplicationService
        app_service = ApplicationService(self.session)
        employer_id = uuid.UUID(employer_id_str)

        if job_id_str:
            job_id = uuid.UUID(job_id_str)
            apps, _ = await app_service.get_job_applications(employer_id, job_id, limit=100)
        else:
            apps, _ = await app_service.get_all_employer_applications(employer_id, limit=100)

        result = []
        for a in apps:
            candidate_name = a.worker.full_name or a.worker.username if a.worker else "Соискатель"
            candidate_email = a.worker.email if a.worker else "Нет данных"
            skills = []
            position = "Не указана"
            if a.worker and a.worker.worker_profile:
                wp = a.worker.worker_profile
                position = wp.desired_position or "Не указана"
                skills = [ws.skill.name for ws in wp.worker_skills if ws.skill]

            result.append({
                "application_id": str(a.id),
                "job_id": str(a.job_id),
                "job_title": a.job.title if a.job else "Вакансия",
                "candidate_id": str(a.worker_id),
                "candidate_name": candidate_name,
                "candidate_email": candidate_email,
                "desired_position": position,
                "skills": skills,
                "cover_note": a.cover_note or a.cover_letter or "Без сопроводительного письма",
                "status": a.status.value if hasattr(a.status, "value") else str(a.status),
                "created_at": a.created_at.isoformat() if hasattr(a, "created_at") and a.created_at else ""
            })
        return result

    async def accept_application_by_ai(self, employer_id_str: str, application_id_str: str, feedback: Optional[str] = None) -> Dict[str, Any]:
        """Accept an application via AI request through backend ApplicationService."""
        from app.services.application import ApplicationService
        from app.models.enums import ApplicationStatus
        app_service = ApplicationService(self.session)
        employer_id = uuid.UUID(employer_id_str)
        application_id = uuid.UUID(application_id_str)

        updated_app = await app_service.update_application_status(
            employer_id=employer_id,
            application_id=application_id,
            new_status=ApplicationStatus.ACCEPTED,
            employer_feedback=feedback or "Отклик одобрен через ИИ-консультанта HamKor"
        )
        return {
            "status": "success",
            "application_id": str(updated_app.id),
            "new_status": "accepted",
            "message": f"Отклик кандидата успешно принят. Уведомление и письмо отправлены."
        }

    async def reject_application_by_ai(self, employer_id_str: str, application_id_str: str, feedback: Optional[str] = None) -> Dict[str, Any]:
        """Reject an application via AI request through backend ApplicationService."""
        from app.services.application import ApplicationService
        from app.models.enums import ApplicationStatus
        app_service = ApplicationService(self.session)
        employer_id = uuid.UUID(employer_id_str)
        application_id = uuid.UUID(application_id_str)

        updated_app = await app_service.update_application_status(
            employer_id=employer_id,
            application_id=application_id,
            new_status=ApplicationStatus.REJECTED,
            employer_feedback=feedback or "Отклик отклонён через ИИ-консультанта HamKor"
        )
        return {
            "status": "success",
            "application_id": str(updated_app.id),
            "new_status": "rejected",
            "message": f"Отклик кандидата отклонён. Уведомление и письмо отправлены."
        }

