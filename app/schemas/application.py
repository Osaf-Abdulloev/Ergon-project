from datetime import datetime
import uuid
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.models.enums import ApplicationStatus
from app.schemas.user import UserOut
from app.schemas.job import JobOut

class ApplicationCreate(BaseModel):
    job_id: uuid.UUID
    cover_note: Optional[str] = None
    cover_letter: Optional[str] = None
    resume_url: Optional[str] = None
    resume_id: Optional[uuid.UUID] = None

class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus
    employer_feedback: Optional[str] = None
    rejection_reason: Optional[str] = None
    rating: Optional[int] = None

class ApplicationCoverNoteUpdate(BaseModel):
    cover_note: str

class ApplicationStatusHistoryOut(BaseModel):
    id: uuid.UUID
    application_id: uuid.UUID
    previous_status: Optional[str] = None
    new_status: str
    changed_by_user_id: Optional[uuid.UUID] = None
    feedback: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ApplicationOut(BaseModel):
    id: uuid.UUID
    worker_id: uuid.UUID
    job_id: uuid.UUID
    status: ApplicationStatus
    cover_note: Optional[str] = None
    cover_letter: Optional[str] = None
    resume_url: Optional[str] = None
    resume_id: Optional[uuid.UUID] = None
    employer_feedback: Optional[str] = None
    rejection_reason: Optional[str] = None
    rating: Optional[int] = None
    is_read_by_employer: bool = False
    read_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    worker: Optional[UserOut] = None
    job: Optional[JobOut] = None
    can_accept: bool = False
    can_reject: bool = False
    can_contact: bool = False
    employer_id: Optional[uuid.UUID] = None
    company_user_id: Optional[uuid.UUID] = None
    accepted_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    status_history: List[ApplicationStatusHistoryOut] = []

    model_config = ConfigDict(from_attributes=True)
