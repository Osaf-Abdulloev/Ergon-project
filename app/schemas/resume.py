import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.models.enums import ResumeStatus

class PersonalInfo(BaseModel):
    full_name: str = ""
    desired_position: str = ""
    email: str = ""
    phone: str = ""
    city: str = ""
    photo_url: Optional[str] = None
    summary: str = ""

class WorkExperienceItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_name: str = ""
    position: str = ""
    start_date: str = ""
    end_date: Optional[str] = ""
    is_current: bool = False
    responsibilities: List[str] = Field(default_factory=list)
    achievements: List[str] = Field(default_factory=list)
    location: Optional[str] = ""

class EducationItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    institution: str = ""
    degree: str = ""
    field_of_study: str = ""
    start_year: str = ""
    end_year: Optional[str] = ""
    location: Optional[str] = ""

class SkillsData(BaseModel):
    technical: List[str] = Field(default_factory=list)
    soft: List[str] = Field(default_factory=list)

class LanguageItem(BaseModel):
    name: str = ""
    proficiency: str = "Native" # Native, Fluent, Advanced, Intermediate, Basic

class CertificateItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    issuer: str = ""
    year: Optional[str] = ""
    credential_url: Optional[str] = ""

class ProjectItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    description: str = ""
    tech_stack: List[str] = Field(default_factory=list)
    link: Optional[str] = ""

class SocialLinks(BaseModel):
    linkedin: Optional[str] = ""
    github: Optional[str] = ""
    portfolio: Optional[str] = ""
    telegram: Optional[str] = ""
    website: Optional[str] = ""

class CustomSectionItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    items: List[str] = Field(default_factory=list)

class ResumeContent(BaseModel):
    personal_info: PersonalInfo = Field(default_factory=PersonalInfo)
    work_experience: List[WorkExperienceItem] = Field(default_factory=list)
    education: List[EducationItem] = Field(default_factory=list)
    skills: SkillsData = Field(default_factory=SkillsData)
    languages: List[LanguageItem] = Field(default_factory=list)
    certificates: List[CertificateItem] = Field(default_factory=list)
    projects: List[ProjectItem] = Field(default_factory=list)
    social_links: SocialLinks = Field(default_factory=SocialLinks)
    custom_sections: List[CustomSectionItem] = Field(default_factory=list)

class AISuggestionItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str # 'summary' | 'skills' | 'experience' | 'languages' | 'formatting'
    section: str
    title: str
    suggestion: str
    action_type: Optional[str] = None # 'add_skill' | 'enhance_summary' | 'add_section'
    payload: Optional[Dict[str, Any]] = None

class ResumeCreateRequest(BaseModel):
    title: Optional[str] = "Моё резюме"
    target_position: Optional[str] = ""
    content: Optional[ResumeContent] = None
    source_file_id: Optional[uuid.UUID] = None

class ResumeUpdateRequest(BaseModel):
    title: Optional[str] = None
    target_position: Optional[str] = None
    status: Optional[ResumeStatus] = None
    content: Optional[ResumeContent] = None

class ParseCVRequest(BaseModel):
    file_id: Optional[uuid.UUID] = None
    raw_text: Optional[str] = None

from pydantic import BaseModel, Field, ConfigDict

class ResumeOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    source_file_id: Optional[uuid.UUID] = None
    title: str
    target_position: Optional[str] = None
    status: ResumeStatus
    content: Dict[str, Any]
    ai_suggestions: Optional[Dict[str, Any]] = None
    completeness_score: int
    is_published: bool
    published_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

