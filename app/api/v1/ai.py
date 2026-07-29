from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.schemas.ai import AIRequest, AIResponse, ResumeAnalysisRequest
from app.schemas.common import MessageResponse
from app.ai.service import AIService
from app.celery.tasks import ai_analysis_task
from app.auth.deps import get_current_user
from app.models.domain import User

router = APIRouter(prefix="/ai", tags=["AI Assistant"])

@router.post("/chat", response_model=AIResponse)
async def ai_chat(
    req: AIRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = AIService(db)
    context = {"user_id": str(current_user.id), "role": current_user.role.value}
    result_text = await service.process_user_query(req.prompt, context=context)
    return AIResponse(result=result_text)

@router.post("/analyze-resume", response_model=MessageResponse, status_code=status.HTTP_202_ACCEPTED)
async def trigger_resume_analysis(
    req: ResumeAnalysisRequest,
    current_user: User = Depends(get_current_user)
):
    prompt_text = req.resume_text or f"Worker ID: {current_user.id}"
    ai_analysis_task.delay(str(current_user.id), prompt_text, "resume_analysis")
    return MessageResponse(message="Resume analysis task dispatched to background worker")
