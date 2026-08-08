import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.schemas.auth import (
    WorkerRegisterRequest, EmployerRegisterRequest, LoginRequest, TokenResponse,
    RefreshTokenRequest, PasswordResetRequest, PasswordResetConfirmRequest, VerifyEmailRequest
)
from app.schemas.user import UserOut
from app.schemas.common import MessageResponse
from app.services.auth import AuthService
from app.auth.deps import get_current_user
from app.models.domain import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

class UnifiedRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    inn: Optional[str] = "010066543"
    role: str = "worker"

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(req: UnifiedRegisterRequest, request: Request, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    base_user = req.email.split("@")[0].replace(".", "_").replace("+", "_")
    username = f"{base_user}_{uuid.uuid4().hex[:6]}"
    
    if req.role == "employer":
        c_name = req.company_name or req.full_name or "Компания"
        inn_val = req.inn if (req.inn and req.inn != "123456789") else "010066543"
        
        try:
            emp_req = EmployerRegisterRequest(
                email=req.email,
                username=username,
                password=req.password,
                company_name=c_name,
                inn=inn_val
            )
            await service.register_employer(emp_req)
        except Exception as err:
            from fastapi import HTTPException
            if isinstance(err, HTTPException):
                raise err
            detail_msg = getattr(err, "detail", None) or str(err)
            raise HTTPException(status_code=400, detail=detail_msg)
    else:
        wrk_req = WorkerRegisterRequest(
            email=req.email,
            username=username,
            password=req.password
        )
        await service.register_worker(wrk_req)

    client_ip = request.client.host if request.client else None
    
    # Dispatch welcome email via Celery background worker (reliable, survives process crash)
    try:
        from app.celery.tasks import send_welcome_email_task
        send_welcome_email_task.delay(req.email, req.full_name or "")
    except Exception:
        pass  # If Redis/Celery unavailable, don't block registration
    
    return await service.login(LoginRequest(email=req.email, password=req.password), client_ip=client_ip)

@router.post("/register/worker", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register_worker(req: WorkerRegisterRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    user = await service.register_worker(req)
    await service.create_email_verification_token(user.id)
    return user

@router.post("/register/employer", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register_employer(req: EmployerRegisterRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    user = await service.register_employer(req)
    await service.create_email_verification_token(user.id)
    return user

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    client_ip = request.client.host if request.client else None
    return await service.login(req, client_ip=client_ip)

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(req: RefreshTokenRequest, request: Request, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    client_ip = request.client.host if request.client else None
    return await service.rotate_refresh_token(req.refresh_token, client_ip=client_ip)

@router.post("/logout", response_model=MessageResponse)
async def logout(req: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    await service.logout(req.refresh_token)
    return MessageResponse(message="Successfully logged out")

@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(req: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    await service.confirm_email_verification(req.token)
    return MessageResponse(message="Email verified successfully")

@router.post("/resend-verification", response_model=MessageResponse)
async def resend_verification(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    await service.create_email_verification_token(current_user.id)
    return MessageResponse(message="Verification token generated and sent")

@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(req: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    await service.create_password_reset_token(req.email)
    return MessageResponse(message="If the email exists, a password reset link has been dispatched")

@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(req: PasswordResetConfirmRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    await service.confirm_password_reset(req.token, req.new_password)
    return MessageResponse(message="Password reset successfully")
