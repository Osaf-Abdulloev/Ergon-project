import uuid
from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, ConfigDict, EmailStr

class WorkExperienceItemSchema(BaseModel):
    company_name: str
    position: str
    start_date: str
    end_date: Optional[str] = None
    is_current: bool = False
    responsibilities: List[str] = []
    achievements: List[str] = []
    location: Optional[str] = None

class EducationItemSchema(BaseModel):
    institution: str
    degree: str
    field_of_study: Optional[str] = None
    start_year: Optional[str] = None
    end_year: Optional[str] = None
    location: Optional[str] = None

class CertificateItemSchema(BaseModel):
    title: str
    issuer: str
    year: Optional[str] = None
    credential_url: Optional[str] = None

class ProjectItemSchema(BaseModel):
    name: str
    description: Optional[str] = None
    tech_stack: List[str] = []
    link: Optional[str] = None

class LanguageItemSchema(BaseModel):
    name: str
    proficiency: str = "Native"

class SocialLinksSchema(BaseModel):
    linkedin: Optional[str] = None
    github: Optional[str] = None
    gitlab: Optional[str] = None
    portfolio: Optional[str] = None
    telegram: Optional[str] = None
    website: Optional[str] = None

class PersonalInfoAnalysisSchema(BaseModel):
    full_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    middle_name: Optional[str] = None
    desired_position: Optional[str] = None
    desired_salary: Optional[float] = None
    salary_currency: Optional[str] = "TJS"
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    work_format: Optional[str] = None
    employment_type: Optional[str] = None
    summary: Optional[str] = None

class SkillsAnalysisSchema(BaseModel):
    technical: List[str] = []
    soft: List[str] = []
    frameworks: List[str] = []
    databases: List[str] = []
    tools: List[str] = []
    languages: List[str] = []

class CVAnalysisResultSchema(BaseModel):
    personal_info: PersonalInfoAnalysisSchema
    work_experience: List[WorkExperienceItemSchema] = []
    education: List[EducationItemSchema] = []
    skills: SkillsAnalysisSchema
    languages: List[LanguageItemSchema] = []
    certificates: List[CertificateItemSchema] = []
    projects: List[ProjectItemSchema] = []
    social_links: SocialLinksSchema
    interests: List[str] = []
    raw_text_summary: Optional[str] = None

class ProposedFieldChange(BaseModel):
    category: str  # 'basic', 'position', 'contact', 'skills', 'experience', 'education', 'links'
    field_name: str
    field_label: str
    current_value: Optional[Any] = None
    proposed_value: Optional[Any] = None
    status: str = "pending"  # 'pending', 'accepted', 'rejected'

class ProfileAISuggestionOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    cv_document_id: uuid.UUID
    status: str
    suggested_changes: List[ProposedFieldChange]
    created_at: datetime
    updated_at: datetime
    reviewed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ConfirmSuggestionsRequest(BaseModel):
    accepted_fields: List[str]  # List of field_name strings to accept
    custom_overrides: Optional[Dict[str, Any]] = None  # User edited values for specific fields

class CVDocumentOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    file_upload_id: Optional[uuid.UUID] = None
    original_filename: str
    file_type: str
    mime_type: str
    file_size: int
    storage_path: str
    processing_status: str
    extraction_method: Optional[str] = None
    processing_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    processed_at: Optional[datetime] = None
    extracted_data: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)
