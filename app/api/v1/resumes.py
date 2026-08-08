import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database.session import get_db
from app.auth.deps import get_current_user
from app.models.domain import User, FileUpload
from app.models.enums import UserRole
from app.schemas.resume import (
    ResumeOut, ResumeCreateRequest, ResumeUpdateRequest, ParseCVRequest, AISuggestionItem
)
from app.services.resume_service import ResumeService
from app.services.resume_ai import ResumeAIService
from app.utils.storage import storage_service
from app.core.config import settings

router = APIRouter(prefix="/resumes", tags=["AI Resume Builder"])

def _check_worker_permission(user: User):
    if user.role != UserRole.WORKER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI Resume Builder is strictly restricted to Job Seekers (Workers). Employers cannot access this feature."
        )

@router.get("", response_model=List[ResumeOut])
async def list_my_resumes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    _check_worker_permission(current_user)
    service = ResumeService(db)
    return await service.get_user_resumes(current_user)

@router.get("/candidate/{user_id}", response_model=Optional[ResumeOut])
async def get_candidate_published_resume(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    service = ResumeService(db)
    try:
        uid = uuid.UUID(user_id)
        return await service.repo.get_user_published_resume(uid)
    except ValueError:
        return None

@router.get("/public/{resume_id}", response_model=Optional[ResumeOut])
async def get_public_published_resume(
    resume_id: str,
    db: AsyncSession = Depends(get_db)
):
    try:
        rid = uuid.UUID(resume_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Published resume not found")
    stmt = select(Resume).where(Resume.id == rid, Resume.is_published == True)
    res = await db.execute(stmt)
    resume = res.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Published resume not found")
    return resume


@router.post("", response_model=ResumeOut, status_code=status.HTTP_201_CREATED)
async def create_draft_resume(
    req: ResumeCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    _check_worker_permission(current_user)
    service = ResumeService(db)
    return await service.create_draft_resume(current_user, req)

@router.post("/parse-cv", response_model=ResumeOut, status_code=status.HTTP_201_CREATED)
async def parse_uploaded_cv(
    file: Optional[UploadFile] = File(None),
    file_id: Optional[uuid.UUID] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    _check_worker_permission(current_user)
    service = ResumeService(db)

    file_bytes = b""
    filename = "resume.pdf"
    mime_type = "application/pdf"
    db_file_id = None

    if file:
        file.file.seek(0, os.SEEK_END)
        file_size = file.file.tell()
        file.file.seek(0)
        file_bytes = await file.read()
        filename = file.filename or "uploaded_cv.pdf"
        mime_type = file.content_type or "application/pdf"

        # Save to FileUpload storage
        file.file.seek(0)
        rel_path, mime_type = await storage_service.save_file(file, folder="resumes")
        file_url = f"/api/v1/files/{rel_path}"

        db_file = FileUpload(
            user_id=current_user.id,
            original_filename=filename,
            stored_filename=os.path.basename(rel_path),
            folder="resumes",
            mime_type=mime_type,
            file_size=file_size,
            storage_path=rel_path,
            url=file_url
        )
        db.add(db_file)
        await db.commit()
        await db.refresh(db_file)
        db_file_id = db_file.id

    elif file_id:
        stmt = select(FileUpload).where(FileUpload.id == file_id, FileUpload.user_id == current_user.id)
        res = await db.execute(stmt)
        db_file = res.scalar_one_or_none()
        if not db_file:
            raise HTTPException(status_code=404, detail="File upload not found")

        full_path = os.path.join(settings.FILE_STORAGE_PATH, db_file.folder, db_file.stored_filename)
        if not os.path.exists(full_path):
            raise HTTPException(status_code=404, detail="CV File does not exist on disk")

        with open(full_path, "rb") as f:
            file_bytes = f.read()

        filename = db_file.original_filename
        mime_type = db_file.mime_type
        db_file_id = db_file.id
    else:
        raise HTTPException(status_code=400, detail="Must provide either a file upload or file_id")

    return await service.parse_and_create_from_cv(
        user=current_user,
        file_bytes=file_bytes,
        filename=filename,
        mime_type=mime_type,
        source_file_id=db_file_id
    )

@router.get("/{resume_id}", response_model=ResumeOut)
async def get_resume_detail(
    resume_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    _check_worker_permission(current_user)
    service = ResumeService(db)
    return await service.get_resume_by_id(current_user, resume_id)

@router.put("/{resume_id}", response_model=ResumeOut)
async def update_resume(
    resume_id: uuid.UUID,
    req: ResumeUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    _check_worker_permission(current_user)
    service = ResumeService(db)
    return await service.update_resume(current_user, resume_id, req)

@router.post("/{resume_id}/publish", response_model=ResumeOut)
async def publish_resume(
    resume_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    _check_worker_permission(current_user)
    service = ResumeService(db)
    return await service.publish_resume(current_user, resume_id)

@router.post("/{resume_id}/duplicate", response_model=ResumeOut, status_code=status.HTTP_201_CREATED)
async def duplicate_resume(
    resume_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    _check_worker_permission(current_user)
    service = ResumeService(db)
    return await service.duplicate_resume(current_user, resume_id)

@router.post("/{resume_id}/ai-suggest")
async def fetch_ai_suggestions(
    resume_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    _check_worker_permission(current_user)
    service = ResumeService(db)
    resume = await service.get_resume_by_id(current_user, resume_id)
    
    eval_data = ResumeAIService.generate_ai_suggestions(resume.content)
    resume.ai_suggestions = eval_data
    resume.completeness_score = eval_data.get("completeness_score", 50)
    await db.commit()

    return eval_data

@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume(
    resume_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    _check_worker_permission(current_user)
    service = ResumeService(db)
    await service.delete_resume(current_user, resume_id)
    return None
