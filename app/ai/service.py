import abc
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.ai.tools import AITools

class BaseAIProvider(abc.ABC):
    @abc.abstractmethod
    async def generate_response(self, prompt: str, context: Optional[Dict[str, Any]] = None) -> str:
        pass

class RuleBasedAIProvider(BaseAIProvider):
    def __init__(self, tools: AITools):
        self.tools = tools

    async def generate_response(self, prompt: str, context: Optional[Dict[str, Any]] = None) -> str:
        p_lower = prompt.lower()
        if "search job" in p_lower or "find job" in p_lower:
            jobs = await self.tools.search_jobs(title=p_lower.replace("search job", "").strip())
            return f"Here are the matching jobs I found:\n{jobs}"
        elif "analyze resume" in p_lower or "check cv" in p_lower:
            analysis = await self.tools.analyze_resume(prompt)
            return f"Resume Analysis Results:\nScore: {analysis['score']}/100\nSkills: {analysis['detected_skills']}\nFeedback: {analysis['feedback']}"
        elif "recommend job" in p_lower:
            if context and "user_id" in context:
                jobs = await self.tools.recommend_jobs(str(context["user_id"]))
                return f"Recommended Jobs for you:\n{jobs}"
            return "Please log in as a worker to get personalized job recommendations."
        elif "recommend candidate" in p_lower:
            if context and "user_id" in context:
                workers = await self.tools.recommend_candidates(str(context["user_id"]))
                return f"Recommended Candidates for your open listings:\n{workers}"
            return "Please log in as an employer to get candidate recommendations."
        else:
            return f"AI Career & Hiring Assistant: I received your request: '{prompt}'. How can I assist you with resume optimization, job search, or candidate screening today?"

class AIService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.tools = AITools(session)
        self.provider: BaseAIProvider = RuleBasedAIProvider(self.tools)

    async def process_user_query(self, prompt: str, context: Optional[Dict[str, Any]] = None) -> str:
        return await self.provider.generate_response(prompt, context)
