import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.database.session import get_db
from app.auth.deps import get_current_user
from app.models.domain import User, Notification
from app.schemas.common import MessageResponse, PaginatedResponse
from app.websocket.manager import ws_manager
from app.core.security import decode_token

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("")
async def get_my_notifications(
    limit: int = Query(default=30, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    res = await db.execute(stmt)
    notifications = res.scalars().all()
    
    unread_count = sum(1 for n in notifications if not n.is_read)
    
    return {
        "items": [
            {
                "id": str(n.id),
                "title": n.title,
                "body": n.body,
                "type": n.type.value if hasattr(n.type, 'value') else str(n.type),
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat() if n.created_at else "",
                "payload": n.payload
            }
            for n in notifications
        ],
        "unread_count": unread_count
    }

@router.post("/{notification_id}/read", response_model=MessageResponse)
async def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        update(Notification)
        .where(Notification.id == notification_id, Notification.user_id == current_user.id)
        .values(is_read=True)
    )
    await db.execute(stmt)
    await db.commit()
    return MessageResponse(message="Notification marked as read")

@router.post("/read-all", response_model=MessageResponse)
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read == False)
        .values(is_read=True)
    )
    await db.execute(stmt)
    await db.commit()
    return MessageResponse(message="All notifications marked as read")

@router.websocket("/ws")
async def notifications_websocket(websocket: WebSocket, token: Optional[str] = Query(default=None)):
    """Real-time WebSocket endpoint for receiving live push notifications without page reload."""
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    payload = decode_token(token)
    if not payload or not payload.get("sub"):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        user_id = uuid.UUID(payload["sub"])
    except ValueError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await ws_manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Simple ping/pong keepalive
            if "ping" in data:
                await websocket.send_text('{"event": "pong"}')
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id, websocket)
