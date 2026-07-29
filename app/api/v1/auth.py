from fastapi import APIRouter, Depends, Request, status
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

@router.post("/register/worker", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register_worker(req: WorkerRegisterRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    user = await service.register_worker(req)
    token = await service.create_email_verification_token(user.id)
    return user

@router.post("/register/employer", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register_employer(req: EmployerRegisterRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    user = await service.register_employer(req)
    token = await service.create_email_verification_token(user.id)
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
    token = await service.create_email_verification_token(current_user.id)
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
