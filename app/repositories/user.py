import uuid
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.domain import User, EmailVerificationToken, PasswordResetToken, RefreshToken
from app.repositories.base import BaseRepository

class UserRepository(BaseRepository[User]):
    def __init__(self, session: AsyncSession):
        super().__init__(User, session)

    async def get_by_email(self, email: str) -> Optional[User]:
        email_clean = email.strip().lower()
        result = await self.session.execute(
            select(User)
            .options(selectinload(User.worker_profile), selectinload(User.company))
            .where((User.email.ilike(email_clean)) | (User.username.ilike(email_clean)))
        )
        return result.scalars().first()

    async def get_by_username(self, username: str) -> Optional[User]:
        uname_clean = username.strip().lower()
        result = await self.session.execute(
            select(User)
            .options(selectinload(User.worker_profile), selectinload(User.company))
            .where((User.username.ilike(uname_clean)) | (User.email.ilike(uname_clean)))
        )
        return result.scalars().first()


    async def get_with_profile(self, user_id: uuid.UUID) -> Optional[User]:
        result = await self.session.execute(
            select(User)
            .options(selectinload(User.worker_profile), selectinload(User.company))
            .where(User.id == user_id)
        )
        return result.scalars().first()

    async def get_worker_profile(self, user_id: uuid.UUID):
        from app.models.domain import WorkerProfile
        result = await self.session.execute(
            select(WorkerProfile).where(WorkerProfile.user_id == user_id)
        )
        return result.scalars().first()


class TokenRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_email_token(self, token: EmailVerificationToken) -> EmailVerificationToken:
        self.session.add(token)
        await self.session.flush()
        return token

    async def get_email_token_by_hash(self, token_hash: str) -> Optional[EmailVerificationToken]:
        result = await self.session.execute(
            select(EmailVerificationToken).where(EmailVerificationToken.token_hash == token_hash)
        )
        return result.scalars().first()

    async def create_password_token(self, token: PasswordResetToken) -> PasswordResetToken:
        self.session.add(token)
        await self.session.flush()
        return token

    async def get_password_token_by_hash(self, token_hash: str) -> Optional[PasswordResetToken]:
        result = await self.session.execute(
            select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
        )
        return result.scalars().first()

    async def create_refresh_token(self, token: RefreshToken) -> RefreshToken:
        self.session.add(token)
        await self.session.flush()
        return token

    async def get_refresh_token_by_hash(self, token_hash: str) -> Optional[RefreshToken]:
        result = await self.session.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        return result.scalars().first()

    async def revoke_refresh_tokens_for_user(self, user_id: uuid.UUID) -> None:
        result = await self.session.execute(
            select(RefreshToken).where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        )
        tokens = result.scalars().all()
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        for t in tokens:
            t.revoked_at = now
        await self.session.flush()
