import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.schemas.auth import (
    WorkerRegisterRequest, EmployerRegisterRequest, LoginRequest, TokenResponse,
    RefreshTokenRequest, PasswordResetRequest, PasswordResetConfirmRequest, VerifyEmailRequest,
    RegisterResponse
)
from app.schemas.user import UserOut
from app.schemas.common import MessageResponse
from app.services.auth import AuthService
from app.auth.deps import get_current_user, get_current_user_optional
from app.models.domain import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

class UnifiedRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    inn: Optional[str] = "010066543"
    role: str = "worker"

class ResendVerificationRequest(BaseModel):
    email: EmailStr

@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(req: UnifiedRegisterRequest, request: Request, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    base_user = req.email.split("@")[0].replace(".", "_").replace("+", "_")
    username = f"{base_user}_{uuid.uuid4().hex[:6]}"
    
    user = None
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
            user = await service.register_employer(emp_req)
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
        user = await service.register_worker(wrk_req)

    return RegisterResponse(
        message="Код подтверждения отправлен на ваш email",
        email=req.email,
        is_email_verified=False,
        role=user.role
    )

@router.post("/register/worker", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register_worker(req: WorkerRegisterRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    user = await service.register_worker(req)
    return user

@router.post("/register/employer", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register_employer(req: EmployerRegisterRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    user = await service.register_employer(req)
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

@router.post("/verify-email", response_model=TokenResponse)
async def verify_email(req: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    code_val = req.code or req.token
    if not code_val:
        from app.core.exceptions import BadRequestException
        raise BadRequestException("Укажите 6-значный код подтверждения")
    return await service.confirm_email_verification(code_val, req.email)

@router.post("/resend-verification", response_model=MessageResponse)
async def resend_verification(req: Optional[ResendVerificationRequest] = None, current_user: Optional[User] = Depends(get_current_user_optional), db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    target_email = req.email if req else (current_user.email if current_user else None)
    if not target_email:
        from app.core.exceptions import BadRequestException
        raise BadRequestException("Email не указан")

    user = await service.user_repo.get_by_email(target_email)
    if not user:
        from app.core.exceptions import NotFoundException
        raise NotFoundException("Пользователь не найден")

    if user.is_email_verified:
        return MessageResponse(message="Email уже подтверждён")

    await service.generate_and_send_verification_code(user.id, force=True)
    return MessageResponse(message="Новый код подтверждения отправлен на ваш email")

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
