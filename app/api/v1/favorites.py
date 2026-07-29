import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.schemas.favorite import FavoriteCreate, FavoriteOut
from app.schemas.common import PaginatedResponse, MessageResponse
from app.services.favorite import FavoriteService
from app.auth.deps import get_current_user
from app.models.domain import User
from app.models.enums import FavoriteTargetType

router = APIRouter(prefix="/favorites", tags=["Favorites"])

@router.post("", response_model=FavoriteOut, status_code=status.HTTP_201_CREATED)
async def add_favorite(
    data: FavoriteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = FavoriteService(db)
    return await service.add_favorite(current_user.id, data)

@router.get("", response_model=PaginatedResponse[FavoriteOut])
async def list_favorites(
    target_type: Optional[FavoriteTargetType] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = FavoriteService(db)
    skip = (page - 1) * limit
    items, total = await service.list_favorites(current_user.id, target_type=target_type, skip=skip, limit=limit)
    pages = (total + limit - 1) // limit if total > 0 else 1
    return PaginatedResponse(items=items, total=total, page=page, limit=limit, pages=pages)

@router.delete("/{target_type}/{target_id}", response_model=MessageResponse)
async def remove_favorite(
    target_type: FavoriteTargetType,
    target_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = FavoriteService(db)
    await service.remove_favorite(current_user.id, target_type, target_id)
    return MessageResponse(message="Removed from favorites")
