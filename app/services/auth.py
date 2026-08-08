from datetime import datetime, timedelta, timezone
import secrets
import uuid
from typing import Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.domain import User, WorkerProfile, Company, EmailVerificationToken, PasswordResetToken, RefreshToken
from app.models.enums import UserRole
from app.schemas.auth import (
    WorkerRegisterRequest, EmployerRegisterRequest, LoginRequest, TokenResponse
)
from app.repositories.user import UserRepository, TokenRepository
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token, hash_token
from app.core.exceptions import ConflictException, UnauthorizedException, NotFoundException, AppException

def ensure_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)
        self.token_repo = TokenRepository(session)

    async def register_worker(self, req: WorkerRegisterRequest) -> User:
        if await self.user_repo.get_by_email(req.email):
            raise ConflictException("Email already registered")
        if await self.user_repo.get_by_username(req.username):
            raise ConflictException("Username already taken")

        user = User(
            email=req.email,
            username=req.username,
            password_hash=hash_password(req.password),
            role=UserRole.WORKER,
            phone=req.phone,
            city=req.city,
            is_email_verified=False,
            is_active=True
        )
        user = await self.user_repo.create(user)

        profile = WorkerProfile(
            user_id=user.id
        )
        self.session.add(profile)
        await self.session.flush()

        return user

    async def register_employer(self, req: EmployerRegisterRequest) -> User:
        from app.services.company_verification import verify_company_inn_and_name
        
        # Verify INN and Company Name against Tajikistan Tax Registry
        _, official_name = verify_company_inn_and_name(req.inn, req.company_name)

        if await self.user_repo.get_by_email(req.email):
            raise ConflictException("Email already registered")
        if await self.user_repo.get_by_username(req.username):
            raise ConflictException("Username already taken")

        user = User(
            email=req.email,
            username=req.username,
            password_hash=hash_password(req.password),
            role=UserRole.EMPLOYER,
            phone=req.phone,
            city=req.city,
            is_email_verified=False,
            is_active=True
        )
        user = await self.user_repo.create(user)

        company = Company(
            employer_id=user.id,
            company_name=official_name,
            inn=req.inn.strip(),
            industry=req.industry,
            is_verified=True
        )
        self.session.add(company)
        await self.session.flush()

        return user

    async def login(self, req: LoginRequest, client_ip: Optional[str] = None) -> TokenResponse:
        user = await self.user_repo.get_by_email(req.email)
        if not user or not verify_password(req.password, user.password_hash):
            raise UnauthorizedException("Invalid email or password")

        if not user.is_active:
            raise UnauthorizedException("User account is deactivated")

        access_token = create_access_token(subject=user.id, role=user.role.value)
        refresh_token = create_refresh_token(subject=user.id)

        token_hash = hash_token(refresh_token)
        ref_model = RefreshToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            created_by_ip=client_ip
        )
        await self.token_repo.create_refresh_token(ref_model)
        await self.session.commit()

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            role=user.role
        )

    async def rotate_refresh_token(self, refresh_token_str: str, client_ip: Optional[str] = None) -> TokenResponse:
        try:
            payload = decode_token(refresh_token_str)
            if payload.get("type") != "refresh":
                raise UnauthorizedException("Invalid token type")
            user_id = uuid.UUID(payload.get("sub"))
        except Exception:
            raise UnauthorizedException("Invalid refresh token")

        user = await self.user_repo.get_by_id(user_id)
        if not user or not user.is_active:
            raise UnauthorizedException("User not found or inactive")

        token_hash = hash_token(refresh_token_str)
        token_record = await self.token_repo.get_refresh_token_by_hash(token_hash)

        if token_record and token_record.revoked_at is not None:
            raise UnauthorizedException("Token has been revoked")

        if token_record and ensure_utc(token_record.expires_at) < datetime.now(timezone.utc):
            raise UnauthorizedException("Refresh token expired")

        if token_record:
            token_record.revoked_at = datetime.now(timezone.utc)

        new_access_token = create_access_token(subject=user.id, role=user.role.value)
        new_refresh_token = create_refresh_token(subject=user.id)

        new_token_hash = hash_token(new_refresh_token)
        new_ref_model = RefreshToken(
            user_id=user.id,
            token_hash=new_token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(days=90),
            created_by_ip=client_ip
        )
        await self.token_repo.create_refresh_token(new_ref_model)
        await self.session.commit()

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            role=user.role
        )

    async def logout(self, refresh_token_str: str) -> None:
        token_hash = hash_token(refresh_token_str)
        token_record = await self.token_repo.get_refresh_token_by_hash(token_hash)
        if token_record and not token_record.revoked_at:
            token_record.revoked_at = datetime.now(timezone.utc)
            await self.session.commit()

    async def create_email_verification_token(self, user_id: uuid.UUID) -> str:
        raw_token = secrets.token_urlsafe(32)
        token_hash = hash_token(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

        token_model = EmailVerificationToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at
        )
        await self.token_repo.create_email_token(token_model)
        await self.session.commit()
        return raw_token

    async def confirm_email_verification(self, raw_token: str) -> None:
        token_hash = hash_token(raw_token)
        token_record = await self.token_repo.get_email_token_by_hash(token_hash)

        if not token_record or token_record.used_at is not None:
            raise AppException("Invalid or used verification token")

        if ensure_utc(token_record.expires_at) < datetime.now(timezone.utc):
            raise AppException("Verification token expired")

        token_record.used_at = datetime.now(timezone.utc)
        user = await self.user_repo.get_by_id(token_record.user_id)
        if user:
            user.is_email_verified = True
        await self.session.commit()

    async def create_password_reset_token(self, email: str) -> Optional[str]:
        user = await self.user_repo.get_by_email(email)
        if not user:
            return None

        raw_token = secrets.token_urlsafe(32)
        token_hash = hash_token(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

        token_model = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at
        )
        await self.token_repo.create_password_token(token_model)
        await self.session.commit()
        return raw_token

    async def confirm_password_reset(self, raw_token: str, new_password: str) -> None:
        token_hash = hash_token(raw_token)
        token_record = await self.token_repo.get_password_token_by_hash(token_hash)

        if not token_record or token_record.used_at is not None:
            raise AppException("Invalid or used reset token")

        if ensure_utc(token_record.expires_at) < datetime.now(timezone.utc):
            raise AppException("Reset token expired")

        token_record.used_at = datetime.now(timezone.utc)
        user = await self.user_repo.get_by_id(token_record.user_id)
        if user:
            user.password_hash = hash_password(new_password)
        await self.session.commit()
