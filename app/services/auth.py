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
        existing_user = await self.user_repo.get_by_email(req.email)
        if existing_user:
            if existing_user.is_email_verified:
                raise ConflictException("Пользователь с таким email уже зарегистрирован. Пожалуйста, войдите в аккаунт.")
            # Unverified account exists: update password & info, force send code
            existing_user.password_hash = hash_password(req.password)
            existing_user.username = req.username
            if req.phone:
                existing_user.phone = req.phone
            if req.city:
                existing_user.city = req.city
            await self.session.commit()
            await self.generate_and_send_verification_code(existing_user.id, force=True)
            return existing_user

        if await self.user_repo.get_by_username(req.username):
            raise ConflictException("Имя пользователя уже занято")

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

        await self.generate_and_send_verification_code(user.id, force=True)
        return user

    async def register_employer(self, req: EmployerRegisterRequest) -> User:
        from app.services.company_verification import verify_company_inn_and_name
        
        # Verify INN and Company Name against Tax Registry
        _, official_name = verify_company_inn_and_name(req.inn, req.company_name)

        existing_user = await self.user_repo.get_by_email(req.email)
        if existing_user:
            if existing_user.is_email_verified:
                raise ConflictException("Пользователь с таким email уже зарегистрирован. Пожалуйста, войдите в аккаунт.")
            existing_user.password_hash = hash_password(req.password)
            existing_user.username = req.username
            if req.phone:
                existing_user.phone = req.phone
            if req.city:
                existing_user.city = req.city
            await self.session.commit()
            await self.generate_and_send_verification_code(existing_user.id, force=True)
            return existing_user

        if await self.user_repo.get_by_username(req.username):
            raise ConflictException("Имя пользователя уже занято")

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

        await self.generate_and_send_verification_code(user.id, force=True)
        return user

    async def login(self, req: LoginRequest, client_ip: Optional[str] = None) -> TokenResponse:
        user = await self.user_repo.get_by_email(req.email)
        if not user or not verify_password(req.password, user.password_hash):
            raise UnauthorizedException("Неверный email или пароль")

        if not user.is_active:
            raise UnauthorizedException("Аккаунт заблокирован")

        if not user.is_email_verified:
            await self.generate_and_send_verification_code(user.id, force=True)
            from app.core.exceptions import UnverifiedUserException
            raise UnverifiedUserException(
                detail={
                    "message": "Email не подтверждён. Новый код подтверждения отправлен на ваш email.",
                    "email": user.email
                }
            )

        return await self._grant_login_tokens(user, client_ip=client_ip)

    async def _grant_login_tokens(self, user: User, client_ip: Optional[str] = None) -> TokenResponse:
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

        return await self._grant_login_tokens(user, client_ip=client_ip)

    async def logout(self, refresh_token_str: str) -> None:
        token_hash = hash_token(refresh_token_str)
        token_record = await self.token_repo.get_refresh_token_by_hash(token_hash)
        if token_record and not token_record.revoked_at:
            token_record.revoked_at = datetime.now(timezone.utc)
            await self.session.commit()

    async def generate_and_send_verification_code(self, user_id: uuid.UUID, force: bool = False) -> str:
        import asyncio
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException("Пользователь не найден")

        # Rate limiting check: check if code sent in last 60 seconds unless force=True
        latest_token = await self.token_repo.get_latest_email_token_for_user(user_id)
        now = datetime.now(timezone.utc)
        if not force and latest_token and latest_token.last_sent_at:
            last_sent = ensure_utc(latest_token.last_sent_at)
            if (now - last_sent).total_seconds() < 60:
                remaining = int(60 - (now - last_sent).total_seconds())
                raise ConflictException(f"Повторная отправка кода возможна через {remaining} сек.")

        # Generate cryptographically secure random 6-digit code
        code = f"{secrets.randbelow(900000) + 100000}"
        code_hash = hash_token(code)
        expires_at = now + timedelta(minutes=10)

        # Invalidate previous unused active tokens for this user
        if latest_token and latest_token.used_at is None:
            latest_token.used_at = now

        token_model = EmailVerificationToken(
            user_id=user_id,
            token_hash=code_hash,
            expires_at=expires_at,
            attempts_count=0,
            last_sent_at=now,
            created_at=now
        )
        await self.token_repo.create_email_token(token_model)
        await self.session.commit()

        # Requirement 9: Send verification email DIRECTLY through Gmail SMTP (NO CELERY)
        from app.services.email_service import EmailService
        try:
            sent_ok = await asyncio.to_thread(EmailService.send_verification_code_email, user.email, code)
            if not sent_ok:
                raise AppException("Не удалось отправить код на ваш email. Проверьте правильность почты.")
        except Exception as smtp_err:
            if isinstance(smtp_err, AppException):
                raise smtp_err
            raise AppException(f"Ошибка при отправке email: {str(smtp_err)}")

        return code

    async def create_email_verification_token(self, user_id: uuid.UUID) -> str:
        return await self.generate_and_send_verification_code(user_id)

    async def confirm_email_verification(self, code_or_token: str, email: Optional[str] = None) -> TokenResponse:
        code_clean = (code_or_token or "").strip()
        if not code_clean:
            raise AppException("Необходим 6-значный код подтверждения")

        user = None
        if email:
            user = await self.user_repo.get_by_email(email)

        token_hash = hash_token(code_clean)
        token_record = await self.token_repo.get_email_token_by_hash(token_hash)

        if not token_record and user:
            token_record = await self.token_repo.get_latest_email_token_for_user(user.id)

        if not token_record and not user:
            raise AppException("Неверный код подтверждения")

        if not user and token_record:
            user = await self.user_repo.get_by_id(token_record.user_id)
            if not user:
                raise NotFoundException("Пользователь не найден")

        if user and user.is_email_verified:
            return await self._grant_login_tokens(user)

        if token_record:
            if token_record.used_at is not None:
                raise AppException("Этот код подтверждения уже был использован")

            now = datetime.now(timezone.utc)
            if ensure_utc(token_record.expires_at) < now:
                raise AppException("Срок действия кода подтверждения истёк. Запросите новый код.")

            if token_record.attempts_count >= 5:
                raise AppException("Превышено количество попыток ввода. Запросите новый код.")

            # Validate exact code hash match (NO bypasses allowed)
            if token_record.token_hash != token_hash:
                token_record.attempts_count += 1
                await self.session.commit()
                raise AppException("Неверный код подтверждения")

            token_record.used_at = now

        if user:
            user.is_email_verified = True
            user.is_active = True
            await self.session.commit()

            # Create Welcome notification in DB and queue Celery Welcome Email
            try:
                from app.services.notification_service import NotificationService
                from app.models.enums import NotificationType
                await NotificationService.send_notification(
                    self.session,
                    user.id,
                    "Добро пожаловать в HamKor!",
                    "Ваш аккаунт успешно создан и подтверждён. Теперь вам доступен полный функционал платформы.",
                    type=NotificationType.SYSTEM
                )
                from app.celery.tasks import send_welcome_email_task
                send_welcome_email_task.delay(user.email, user.full_name or user.username or "")
            except Exception:
                pass

            return await self._grant_login_tokens(user)

        raise AppException("Недействительный или истёкший код подтверждения")

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

        # Queue Password Reset Email via Celery
        try:
            from app.celery.tasks import send_password_reset_email_task
            send_password_reset_email_task.delay(user.email, raw_token)
        except Exception:
            pass

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
