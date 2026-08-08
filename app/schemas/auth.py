from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.models.enums import UserRole

class WorkerRegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6)
    phone: Optional[str] = None
    city: Optional[str] = None

class EmployerRegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6)
    company_name: str = Field(min_length=2, max_length=255)
    inn: Optional[str] = Field(default="010066543", max_length=12)
    phone: Optional[str] = None
    city: Optional[str] = None
    industry: Optional[str] = None

class LoginRequest(BaseModel):
    email: str = Field(min_length=1, description="Email or Username")
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: UserRole

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirmRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=6)

class VerifyEmailRequest(BaseModel):
    token: str
