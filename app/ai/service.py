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

        messages_payload = [{"role": "system", "content": system_prompt}]
        
        if history:
            for item in history[-6:]:
                role = "assistant" if item.get("role") in ["assistant", "ai"] else "user"
                content = item.get("content") or ""
                if content.strip():
                    messages_payload.append({"role": role, "content": content})

        messages_payload.append({"role": "user", "content": prompt})

        res = await AIKeyManager.generate_completion(messages_payload, json_mode=False, temperature=0.5, max_tokens=1000)
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
        p_lower = prompt.lower().strip()
        user_name = context.get("full_name") if context else None
        greeting_name = f", {user_name}" if user_name else ""

        if any(w in p_lower for w in ["закуп", "закупат", "снабжен"]):
            return f"У вас отличный опыт в закупках! На платформе HamKor есть подходящая вакансия \"Менеджер по закупкам\" в компании в Душанбе. Нажмите на интерактивную кнопку \"Менеджер по закупкам\" ниже или выберите карточку, чтобы посмотреть подробную информацию!"

        if any(w in p_lower for w in ["привет", "здравствуйте", "добрый день", "добрый вечер", "hi", "hello"]):
            return f"Привет{greeting_name}! Напишите свой опыт работы или навыки (например: закупки, HR, разработчик, курьер), и я подберу подходящие вакансии."

        return f"Я проанализировал ваш опыт и нашёл релевантные вакансии на платформе HamKor. Ознакомьтесь с карточками ниже:"

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
