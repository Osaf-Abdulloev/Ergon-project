import json
import logging
import random
import re
import uuid
import httpx
from typing import Dict, Any, List, Optional
from app.schemas.resume import ResumeContent, PersonalInfo, WorkExperienceItem, EducationItem, SkillsData, LanguageItem, SocialLinks, CustomSectionItem, AISuggestionItem
from app.ai.key_manager import AIKeyManager

logger = logging.getLogger(__name__)

class ResumeAIService:
    @staticmethod
    async def extract_structured_resume_from_text(raw_text: str, user_profile: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Uses Groq Llama 3.3 70B to analyze CV text and extract structured resume data.
        """
        if not raw_text or len(raw_text.strip()) < 10:
            return ResumeAIService._fallback_heuristic_extraction(raw_text or "", user_profile)

        user_name = (user_profile or {}).get("full_name") or (user_profile or {}).get("username") or ""
        user_email = (user_profile or {}).get("email") or ""
        user_phone = (user_profile or {}).get("phone") or ""
        user_city = (user_profile or {}).get("city") or "Душанбе"

        system_prompt = (
            "You are a world-class AI Principal Resume Architect and Executive Recruiter.\n"
            "Your mission is to perform a HIGH-PRECISION 100% ACCURATE EXTRACTION of the candidate's CV text. Extract EVERY real detail, skill, technology, framework, database, software, job position, company, achievement, responsibility, education item, certificate, project, and link.\n\n"
            "MANDATORY EXTRACTION RULES:\n"
            "1. Output ONLY a valid JSON object matching the requested schema.\n"
            "2. STRICT TRUTHFULNESS: Extract ONLY real factual data directly present or clearly implied in the candidate's CV. Do NOT fabricate companies, dates, or degrees.\n"
            "3. DEEP SKILLS EXTRACTION: Thoroughly scan the entire text for ALL technical skills, software, programming languages, frameworks, databases, tools, platforms, protocols, methodologies, and soft skills mentioned anywhere in the CV text. Extract at least 8-25 real technical skills and 5-10 real soft skills.\n"
            "4. FULL WORK EXPERIENCE: Extract ALL work experience entries. For each role, extract or formulate 4-8 detailed, professional bullet points under 'responsibilities' describing duties and technologies used, and 2-4 concrete achievements under 'achievements'.\n"
            "5. EXECUTIVE SUMMARY: Formulate a rich 4-5 sentence Professional Summary ('personal_info.summary') in Russian highlighting the candidate's real domain expertise, key skills, and experience.\n"
            "6. EDUCATION & CERTIFICATES: Extract all universities, degrees, majors, graduation years, certificates, and courses.\n"
            "7. JSON SCHEMA STRUCTURE:\n"
            "{\n"
            '  "personal_info": {"full_name": "str", "desired_position": "str", "email": "str", "phone": "str", "city": "str", "summary": "str"},\n'
            '  "work_experience": [{"company_name": "str", "position": "str", "start_date": "str", "end_date": "str", "is_current": true/false, "responsibilities": ["str"], "achievements": ["str"], "location": "str"}],\n'
            '  "education": [{"institution": "str", "degree": "str", "field_of_study": "str", "start_year": "str", "end_year": "str", "location": "str"}],\n'
            '  "skills": {"technical": ["str"], "soft": ["str"]},\n'
            '  "languages": [{"name": "str", "proficiency": "str"}],\n'
            '  "certificates": [{"title": "str", "issuer": "str", "year": "str", "credential_url": "str"}],\n'
            '  "projects": [{"name": "str", "description": "str", "tech_stack": ["str"], "link": "str"}],\n'
            '  "social_links": {"linkedin": "str", "github": "str", "portfolio": "str", "telegram": "str", "website": "str"},\n'
            '  "custom_sections": [{"title": "str", "items": ["str"]}]\n'
            "}\n"
        )

        user_prompt = (
            f"Candidate Profile Context:\nName: {user_name}, Email: {user_email}, Phone: {user_phone}, City: {user_city}\n\n"
            f"FULL CV TEXT TO PARSE, EXTRACT AND ACCURATELY CONVERT TO RESUME:\n{raw_text[:20000]}"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        res_json_str = await AIKeyManager.generate_completion(messages, json_mode=True, temperature=0.1, max_tokens=4000)
        if res_json_str:
            try:
                parsed_dict = json.loads(res_json_str)
                return ResumeAIService._validate_and_enrich_extracted_json(parsed_dict, user_profile, raw_text)
            except Exception as e:
                logger.warning(f"Failed to parse JSON response from AI: {e}")

        # Fallback heuristic parsing if AI is unreachable
        return ResumeAIService._fallback_heuristic_extraction(raw_text, user_profile)

    @staticmethod
    def _validate_and_enrich_extracted_json(
        data: Dict[str, Any], 
        user_profile: Optional[Dict[str, Any]] = None,
        raw_text: str = ""
    ) -> Dict[str, Any]:
        """
        Ensures all keys exist, assigns unique IDs to items, maps flexible keys, and enriches missing fields.
        """
        p_info = data.get("personal_info") or {}
        u_prof = user_profile or {}

        clean_pinfo = {
            "full_name": p_info.get("full_name") or u_prof.get("full_name") or u_prof.get("username") or "",
            "desired_position": p_info.get("desired_position") or u_prof.get("desired_position") or "Специалист",
            "email": p_info.get("email") or u_prof.get("email") or "",
            "phone": p_info.get("phone") or u_prof.get("phone") or "",
            "city": p_info.get("city") or u_prof.get("city") or "Душанбе",
            "photo_url": u_prof.get("avatar_url") or "",
            "summary": p_info.get("summary") or u_prof.get("bio") or ""
        }

        # Work Experience with flexible key mapping
        raw_exp = data.get("work_experience") or data.get("experiences") or []
        clean_exp = []
        for item in raw_exp:
            if isinstance(item, dict):
                comp = item.get("company_name") or item.get("company") or item.get("organization") or "Организация"
                pos = item.get("position") or item.get("role") or item.get("title") or item.get("role_title") or "Специалист"
                start = item.get("start_date") or item.get("start") or item.get("period") or "2021"
                end = item.get("end_date") or item.get("end") or ("По настоящее время" if item.get("is_current") else "")
                
                resps = item.get("responsibilities") or item.get("description") or []
                if isinstance(resps, str):
                    resps = [r.strip(" •-*") for r in resps.splitlines() if r.strip()]
                elif not isinstance(resps, list):
                    resps = []

                achieves = item.get("achievements") or []
                if isinstance(achieves, str):
                    achieves = [a.strip(" •-*") for a in achieves.splitlines() if a.strip()]
                elif not isinstance(achieves, list):
                    achieves = []

                clean_exp.append({
                    "id": str(uuid.uuid4()),
                    "company_name": comp,
                    "position": pos,
                    "start_date": start,
                    "end_date": end,
                    "is_current": bool(item.get("is_current", False)),
                    "responsibilities": resps,
                    "achievements": achieves,
                    "location": item.get("location") or "Душанбе"
                })

        # Education
        raw_edu = data.get("education") or []
        clean_edu = []
        for item in raw_edu:
            if isinstance(item, dict):
                inst = item.get("institution") or item.get("university") or item.get("school") or "Университет"
                deg = item.get("degree") or item.get("qualification") or "Высшее образование"
                field = item.get("field_of_study") or item.get("major") or item.get("specialty") or ""
                clean_edu.append({
                    "id": str(uuid.uuid4()),
                    "institution": inst,
                    "degree": deg,
                    "field_of_study": field,
                    "start_year": str(item.get("start_year") or item.get("start") or ""),
                    "end_year": str(item.get("end_year") or item.get("end") or ""),
                    "location": item.get("location") or "Таджикистан"
                })

        # Comprehensive 70+ Skill Keyword Scanner from raw CV text
        raw_skills = data.get("skills") or {}
        if isinstance(raw_skills, list):
            tech_skills = raw_skills
            soft_skills = []
        else:
            tech_skills = raw_skills.get("technical") or raw_skills.get("hard") or []
            soft_skills = raw_skills.get("soft") or []

        if not isinstance(tech_skills, list): tech_skills = []
        if not isinstance(soft_skills, list): soft_skills = []

        common_tech = [
            "Python", "FastAPI", "Django", "Flask", "React", "Next.js", "Vue.js", "Angular", "JavaScript", "TypeScript",
            "HTML", "HTML5", "CSS", "CSS3", "Tailwind", "TailwindCSS", "Node.js", "Express", "Java", "Spring", "C#", ".NET", "C++", "PHP", "Laravel", "Go", "Ruby",
            "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Oracle", "Docker", "Kubernetes", "Git", "GitHub", "GitLab", "Linux", "Nginx", "REST API", "GraphQL",
            "Figma", "Photoshop", "Illustrator", "Excel", "MS Office", "1C", "1С:Предприятие", "CRM", "Bitrix24", "Salesforce", "SMM", "SEO", "HR", "Recruiting",
            "Project Management", "Agile", "Scrum", "Kanban", "Jira", "English", "Russian", "Tajik",
            "Бухгалтерия", "Финансы", "Аудит", "Кадры", "Логистика", "Закупки", "Складской учет", "Делопроизводство", "Продажи", "Клиентский сервис"
        ]

        if raw_text:
            for sk in common_tech:
                if re.search(r'\b' + re.escape(sk) + r'\b', raw_text, re.IGNORECASE) and sk not in tech_skills:
                    tech_skills.append(sk)

        tech_skills = list(dict.fromkeys([s.strip() for s in tech_skills if s and len(s.strip()) >= 2]))
        soft_skills = list(dict.fromkeys([s.strip() for s in soft_skills if s and len(s.strip()) >= 2]))



        # Languages
        raw_lang = data.get("languages") or []
        clean_lang = []
        for item in raw_lang:
            if isinstance(item, dict) and item.get("name"):
                clean_lang.append({
                    "name": item.get("name"),
                    "proficiency": item.get("proficiency") or "Native"
                })
        if not clean_lang:
            clean_lang = [{"name": "Русский", "proficiency": "Native"}, {"name": "Тоҷикӣ", "proficiency": "Native"}]

        # Certificates
        raw_certs = data.get("certificates") or []
        clean_certs = []
        for item in raw_certs:
            if isinstance(item, dict) and item.get("title"):
                clean_certs.append({
                    "id": str(uuid.uuid4()),
                    "title": item.get("title"),
                    "issuer": item.get("issuer") or "",
                    "year": str(item.get("year") or ""),
                    "credential_url": item.get("credential_url") or ""
                })

        # Projects
        raw_proj = data.get("projects") or []
        clean_proj = []
        for item in raw_proj:
            if isinstance(item, dict) and item.get("name"):
                clean_proj.append({
                    "id": str(uuid.uuid4()),
                    "name": item.get("name"),
                    "description": item.get("description") or "",
                    "tech_stack": item.get("tech_stack") if isinstance(item.get("tech_stack"), list) else [],
                    "link": item.get("link") or ""
                })

        # Social links
        raw_soc = data.get("social_links") or {}
        clean_soc = {
            "linkedin": raw_soc.get("linkedin") or "",
            "github": raw_soc.get("github") or "",
            "portfolio": raw_soc.get("portfolio") or "",
            "telegram": raw_soc.get("telegram") or "",
            "website": raw_soc.get("website") or ""
        }

        # Custom sections
        raw_custom = data.get("custom_sections") or []
        clean_custom = []
        for item in raw_custom:
            if isinstance(item, dict) and item.get("title"):
                clean_custom.append({
                    "id": str(uuid.uuid4()),
                    "title": item.get("title"),
                    "items": item.get("items") if isinstance(item.get("items"), list) else []
                })

        return {
            "personal_info": clean_pinfo,
            "work_experience": clean_exp,
            "education": clean_edu,
            "skills": {"technical": tech_skills, "soft": soft_skills},
            "languages": clean_lang,
            "certificates": clean_certs,
            "projects": clean_proj,
            "social_links": clean_soc,
            "custom_sections": clean_custom
        }

    @staticmethod
    def _fallback_heuristic_extraction(raw_text: str, user_profile: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Regex and rule-based heuristic extraction fallback when AI is unavailable.
        """
        u_prof = user_profile or {}

        # Extract Emails & Phones via regex
        emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', raw_text)
        phones = re.findall(r'\+?\d[\d\s\-\(\)]{8,}\d', raw_text)

        # Extended tech skill keyword detection across multiple industries
        common_tech = [
            "Python", "FastAPI", "Django", "Flask", "React", "Next.js", "JavaScript", "TypeScript",
            "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Docker", "Kubernetes", "Git", "GitHub",
            "HTML", "HTML5", "CSS", "CSS3", "Tailwind", "TailwindCSS", "Node.js", "Express", "REST API",
            "Figma", "Excel", "1C", "1С:Предприятие", "CRM", "English", "Russian", "Tajik",
            "HR", "SEO", "Sales", "SMM", "Marketing", "Project Management", "Agile", "Scrum",
            "Linux", "Nginx", "Buhgalteriya", "Бухгалтерия", "Финансы", "Аудит", "Кадры", "Логистика"
        ]
        found_tech = [sk for sk in common_tech if re.search(r'\b' + re.escape(sk) + r'\b', raw_text, re.IGNORECASE)]

        # Extract non-empty lines for responsibilities and text analysis
        raw_lines = [l.strip(" •-*").strip() for l in raw_text.splitlines() if len(l.strip()) > 15]
        summary_lines = raw_lines[:3] if raw_lines else []
        summary_text = " ".join(summary_lines) if summary_lines else u_prof.get("bio") or "Квалифицированный специалист с высоким уровнем ответственности и ориентацией на качественный результат."

        bullet_resp = raw_lines[3:10] if len(raw_lines) >= 10 else (raw_lines[1:] if len(raw_lines) > 1 else [
            "Выполнение профессиональных обязанностей и ведение текущей документации.",
            "Взаимодействие с коллегами и смежными отделами для решения операционных задач.",
            "Контроль качества выполнения проектов и оптимизация рабочих процессов.",
            "Соблюдение регламентов, стандартов компании и сроков выполнения задач."
        ])

        achievements_list = [
            "Оптимизация ключевых процессов, сократившая время обработки задач.",
            "Успешное завершение плановых показателей и проектов без отклонения от графиков."
        ]

        pos_title = u_prof.get("desired_position") or "Специалист"

        return {
            "personal_info": {
                "full_name": u_prof.get("full_name") or u_prof.get("username") or "Соискатель",
                "desired_position": pos_title,
                "email": emails[0] if emails else u_prof.get("email") or "",
                "phone": phones[0] if phones else u_prof.get("phone") or "",
                "city": u_prof.get("city") or "Душанбе",
                "photo_url": u_prof.get("avatar_url") or "",
                "summary": summary_text
            },
            "work_experience": [
                {
                    "id": str(uuid.uuid4()),
                    "company_name": "Ведущая компания",
                    "position": pos_title,
                    "start_date": "2021",
                    "end_date": "По настоящее время",
                    "is_current": True,
                    "responsibilities": bullet_resp[:6],
                    "achievements": achievements_list,
                    "location": "Душанбе"
                }
            ],
            "education": [
                {
                    "id": str(uuid.uuid4()),
                    "institution": "Государственный Университет",
                    "degree": "Высшее образование (Бакалавр / Специалист)",
                    "field_of_study": pos_title,
                    "start_year": "2017",
                    "end_year": "2021",
                    "location": "Таджикистан"
                }
            ],
            "skills": {
                "technical": found_tech if len(found_tech) >= 3 else (found_tech + ["Организация процессов", "Аналитика", "Деловая переписка", "MS Office"]),
                "soft": ["Работа в команде", "Решение сложных проблем", "Тайм-менеджмент", "Адаптивность", "Стратегическое мышление"]
            },
            "languages": [
                {"name": "Русский", "proficiency": "Native"},
                {"name": "Тоҷикӣ", "proficiency": "Native"}
            ],
            "certificates": [],
            "projects": [],
            "social_links": {
                "linkedin": "",
                "github": "",
                "portfolio": "",
                "telegram": "",
                "website": ""
            },
            "custom_sections": []
        }

    @staticmethod
    def generate_ai_suggestions(content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluates completeness score and generates tailored improvement suggestions.
        """
        p_info = content.get("personal_info") or {}
        exp = content.get("work_experience") or []
        edu = content.get("education") or []
        skills = content.get("skills") or {}
        tech_skills = skills.get("technical") or []
        languages = content.get("languages") or []

        score = 0
        suggestions: List[Dict[str, Any]] = []

        # 1. Personal Info Evaluation (30 pts)
        if p_info.get("full_name"): score += 5
        if p_info.get("desired_position"): score += 10
        if p_info.get("email"): score += 5
        if p_info.get("phone"): score += 5
        if p_info.get("summary") and len(p_info.get("summary").strip()) > 30:
            score += 5
        else:
            suggestions.append({
                "id": str(uuid.uuid4()),
                "type": "summary",
                "section": "personal_info",
                "title": "Добавьте профессиональное резюме (Summary)",
                "suggestion": "Краткое описание (3-4 предложения) вашего опыта и достижений повышает отклик работодателей на 45%.",
                "action_type": "enhance_summary",
                "payload": {"text": f"Квалифицированный специалист с практическим опытом. Ответственно подхожу к задачам, постоянно развиваю профессиональные навыки."}
            })

        # 2. Experience Evaluation (35 pts)
        if exp and len(exp) > 0:
            score += 25
            has_resp = any(e.get("responsibilities") and len(e.get("responsibilities")) > 0 for e in exp)
            if has_resp:
                score += 10
            else:
                suggestions.append({
                    "id": str(uuid.uuid4()),
                    "type": "experience",
                    "section": "work_experience",
                    "title": "Опишите ключевые обязанности",
                    "suggestion": "Укажите 3-5 конкретных задач, которые вы выполняли на предыдущих местах работы.",
                    "action_type": "add_section"
                })
        else:
            suggestions.append({
                "id": str(uuid.uuid4()),
                "type": "experience",
                "section": "work_experience",
                "title": "Укажите опыт работы",
                "suggestion": "Добавьте хотя бы одно место работы или проектную практику, чтобы резюме выглядело солидно.",
                "action_type": "add_section"
            })

        # 3. Skills Evaluation (20 pts)
        if tech_skills and len(tech_skills) >= 5:
            score += 20
        elif tech_skills:
            score += 10
            suggestions.append({
                "id": str(uuid.uuid4()),
                "type": "skills",
                "section": "skills",
                "title": "Расширьте список ключевых навыков",
                "suggestion": "Рекомендуется указать минимум 5-8 профессиональных навыков.",
                "action_type": "add_skill",
                "payload": {"suggested_skills": ["Коммуникация", "Организованность", "Аналитическое мышление"]}
            })
        else:
            suggestions.append({
                "id": str(uuid.uuid4()),
                "type": "skills",
                "section": "skills",
                "title": "Добавьте профессиональные навыки",
                "suggestion": "Работодатели часто ищут кандидатов по совпадению ключевых навыков.",
                "action_type": "add_skill"
            })

        # 4. Education & Languages (15 pts)
        if edu and len(edu) > 0: score += 10
        if languages and len(languages) > 0: score += 5

        completeness = min(100, max(10, score))

        return {
            "completeness_score": completeness,
            "suggestions": suggestions
        }
