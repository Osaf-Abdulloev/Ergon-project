from datetime import datetime
import uuid
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict
from app.models.enums import UserRole

class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    username: str
    role: UserRole
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    is_email_verified: bool
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    username: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    avatar_url: Optional[str] = None
