from datetime import datetime
import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.enums import ApplicationStatus
from app.schemas.user import UserOut
from app.schemas.job import JobOut

class ApplicationCreate(BaseModel):
    job_id: uuid.UUID
    cover_note: Optional[str] = None
    cover_letter: Optional[str] = None
    resume_url: Optional[str] = None

class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus
    employer_feedback: Optional[str] = None

class ApplicationCoverNoteUpdate(BaseModel):
    cover_note: str

class ApplicationOut(BaseModel):
    id: uuid.UUID
    worker_id: uuid.UUID
    job_id: uuid.UUID
    status: ApplicationStatus
    cover_note: Optional[str] = None
    cover_letter: Optional[str] = None
    resume_url: Optional[str] = None
    employer_feedback: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    worker: Optional[UserOut] = None
    job: Optional[JobOut] = None
    can_accept: bool = False
    can_reject: bool = False
    can_contact: bool = False

    model_config = ConfigDict(from_attributes=True)
