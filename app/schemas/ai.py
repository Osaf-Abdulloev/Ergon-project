from typing import Optional, Any
from pydantic import BaseModel

class AIRequest(BaseModel):
    prompt: str
    context: Optional[Any] = None

class AIResponse(BaseModel):
    result: str
    tool_calls: Optional[Any] = None

class ResumeAnalysisRequest(BaseModel):
    worker_id: Optional[str] = None
    resume_text: Optional[str] = None

class JobDescriptionGeneratorRequest(BaseModel):
    title: str
    company_name: str
    key_skills: str
