from datetime import datetime
import uuid
from typing import List, Optional, Any
from pydantic import BaseModel, ConfigDict
from app.schemas.user import UserOut

class SkillOut(BaseModel):
    id: uuid.UUID
    name: str

    model_config = ConfigDict(from_attributes=True)

class SkillCreate(BaseModel):
    name: str

class ExperienceOut(BaseModel):
    id: uuid.UUID
    company_name: str
    role_title: str
    start_date: str
    end_date: Optional[str] = None
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ExperienceCreate(BaseModel):
    company_name: str
    role_title: str
    start_date: str
    end_date: Optional[str] = None
    description: Optional[str] = None

class WorkerProfileOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    desired_position: Optional[str] = None
    desired_salary: Optional[float] = None
    bio: Optional[str] = None
    education: Optional[str] = None
    portfolio_links: Optional[Any] = None
    skills: List[SkillOut] = []
    experiences: List[ExperienceOut] = []
    user: Optional[UserOut] = None

    model_config = ConfigDict(from_attributes=True)

class WorkerProfileUpdate(BaseModel):
    desired_position: Optional[str] = None
    desired_salary: Optional[float] = None
    bio: Optional[str] = None
    education: Optional[str] = None
    portfolio_links: Optional[Any] = None
    skills: Optional[List[str]] = None

class CompanyOut(BaseModel):
    id: uuid.UUID
    employer_id: uuid.UUID
    company_name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    is_verified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CompanyUpdate(BaseModel):
    company_name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
