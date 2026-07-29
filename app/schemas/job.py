from datetime import datetime
import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import EmploymentType, JobStatus
from app.schemas.profile import CompanyOut

class JobCreate(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    description: str = Field(min_length=10)
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    currency: str = "TJS"
    location: str
    category: str
    employment_type: EmploymentType
    status: JobStatus = JobStatus.OPEN

class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    currency: Optional[str] = None
    location: Optional[str] = None
    category: Optional[str] = None
    employment_type: Optional[EmploymentType] = None
    status: Optional[JobStatus] = None

class JobOut(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    title: str
    description: str
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    currency: str
    location: str
    category: str
    employment_type: EmploymentType
    status: JobStatus
    created_at: datetime
    updated_at: datetime
    company: Optional[CompanyOut] = None

    model_config = ConfigDict(from_attributes=True)
