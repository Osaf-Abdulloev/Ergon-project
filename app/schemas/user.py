from datetime import datetime
import uuid
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict
from app.models.enums import UserRole

class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    role: UserRole
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    is_email_verified: bool
    is_active: bool
    is_muted: bool = False
    muted_until: Optional[datetime] = None
    mute_reason: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    telegram_username: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    avatar_url: Optional[str] = None
