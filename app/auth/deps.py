import uuid
from typing import List, Callable
from fastapi import Depends, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.models.domain import User
from app.models.enums import UserRole
from app.core.security import decode_token
from app.core.exceptions import UnauthorizedException, ForbiddenException, UnverifiedUserException
from app.repositories.user import UserRepository

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = credentials.credentials
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise UnauthorizedException("Invalid token type")
        user_id_str = payload.get("sub")
        if not user_id_str:
            raise UnauthorizedException("Subject missing in token")
        user_id = uuid.UUID(user_id_str)
    except Exception:
        raise UnauthorizedException("Invalid or expired access token")

    user_repo = UserRepository(db)
    user = await user_repo.get_with_profile(user_id)
    if not user:
        raise UnauthorizedException("User no longer exists")
    if not user.is_active:
        raise UnauthorizedException("User account is inactive")

    return user

def require_roles(allowed_roles: List[UserRole]) -> Callable:
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise ForbiddenException(f"Action requires one of roles: {[r.value for r in allowed_roles]}")
        return current_user
    return role_checker

async def require_verified_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_email_verified:
        raise UnverifiedUserException("Email verification is required for this action")
    return current_user
