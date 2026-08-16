import os
import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, Form, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database.session import get_db
from app.auth.deps import get_current_user
from app.models.domain import User, CVDocument, ProfileAISuggestion
from app.models.enums import UserRole
from app.schemas.cv import (
    CVDocumentOut, ProfileAISuggestionOut, ConfirmSuggestionsRequest
)
from app.services.cv_processing_service import CVProcessingService

router = APIRouter(prefix="/cv", tags=["CV Analysis & Profile Autofill"])

def _check_worker_permission(user: User):
    if user.role != UserRole.WORKER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CV Analysis and Profile Autofill features are strictly restricted to Job Seekers (Workers)."
        )

@router.post("/upload", response_model=CVDocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_cv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    _check_worker_permission(current_user)
    file_bytes = await file.read()
    filename = file.filename or "cv_document.pdf"
    mime_type = file.content_type or "application/pdf"

    service = CVProcessingService(db)
    return await service.upload_and_queue_cv(current_user, file_bytes, filename, mime_type)

@router.get("", response_model=List[CVDocumentOut])
async def list_my_cvs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    _check_worker_permission(current_user)
    stmt = select(CVDocument).where(CVDocument.user_id == current_user.id).order_by(CVDocument.created_at.desc())
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/{cv_id}", response_model=CVDocumentOut)
async def get_cv_detail(
    cv_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    _check_worker_permission(current_user)
    stmt = select(CVDocument).where(CVDocument.id == cv_id, CVDocument.user_id == current_user.id)
    res = await db.execute(stmt)
    cv_doc = res.scalar_one_or_none()
    if not cv_doc:
        raise HTTPException(status_code=404, detail="CV document not found")
    return cv_doc

@router.get("/{cv_id}/status")
async def get_cv_status(
    cv_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    _check_worker_permission(current_user)
    stmt = select(CVDocument).where(CVDocument.id == cv_id, CVDocument.user_id == current_user.id)
    res = await db.execute(stmt)
    cv_doc = res.scalar_one_or_none()
    if not cv_doc:
        raise HTTPException(status_code=404, detail="CV document not found")

    return {
        "id": cv_doc.id,
        "processing_status": cv_doc.processing_status,
        "extraction_method": cv_doc.extraction_method,
        "processing_error": cv_doc.processing_error,
        "processed_at": cv_doc.processed_at
    }

@router.get("/{cv_id}/suggestions", response_model=Optional[ProfileAISuggestionOut])
async def get_cv_profile_suggestions(
    cv_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    _check_worker_permission(current_user)
    stmt = select(ProfileAISuggestion).where(
        ProfileAISuggestion.cv_document_id == cv_id,
        ProfileAISuggestion.user_id == current_user.id
    ).order_by(ProfileAISuggestion.created_at.desc())
    res = await db.execute(stmt)
    return res.scalars().first()

@router.post("/suggestions/{suggestion_id}/confirm", response_model=ProfileAISuggestionOut)
async def confirm_profile_suggestions(
    suggestion_id: uuid.UUID,
    req: ConfirmSuggestionsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    _check_worker_permission(current_user)
    service = CVProcessingService(db)
    return await service.confirm_profile_suggestions(
        current_user, suggestion_id, req.accepted_fields, req.custom_overrides
    )

@router.post("/suggestions/{suggestion_id}/reject", response_model=ProfileAISuggestionOut)
async def reject_profile_suggestions(
    suggestion_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    _check_worker_permission(current_user)
    stmt = select(ProfileAISuggestion).where(
        ProfileAISuggestion.id == suggestion_id,
        ProfileAISuggestion.user_id == current_user.id
    )
    res = await db.execute(stmt)
    suggestion = res.scalar_one_or_none()
    if not suggestion:
        raise HTTPException(status_code=404, detail="Profile suggestion not found")

    suggestion.status = "REJECTED"
    await db.commit()
    await db.refresh(suggestion)
    return suggestion
