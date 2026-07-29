from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.schemas.notification import NotificationOut
from app.schemas.common import PaginatedResponse, MessageResponse
from app.services.notification import NotificationService
from app.auth.deps import get_current_user
from app.models.domain import User

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=PaginatedResponse[NotificationOut])
async def get_my_notifications(
    unread_only: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = NotificationService(db)
    skip = (page - 1) * limit
    items, total = await service.get_user_notifications(current_user.id, unread_only=unread_only, skip=skip, limit=limit)
    pages = (total + limit - 1) // limit if total > 0 else 1
    return PaginatedResponse(items=items, total=total, page=page, limit=limit, pages=pages)

@router.post("/read-all", response_model=MessageResponse)
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = NotificationService(db)
    await service.mark_all_as_read(current_user.id)
    return MessageResponse(message="All notifications marked as read")
