import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db, AsyncSessionLocal
from app.schemas.chat import ChatOut, MessageOut, MessageCreate, CreateChatRequest
from app.schemas.common import PaginatedResponse
from app.services.chat import ChatService
from app.auth.deps import get_current_user
from app.models.domain import User
from app.websocket.manager import ws_manager
from app.core.security import decode_token

router = APIRouter(prefix="/chats", tags=["Real-time Chat"])

@router.post("", response_model=ChatOut, status_code=status.HTTP_201_CREATED)
async def get_or_create_chat(
    data: CreateChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = ChatService(db)
    return await service.get_or_create_chat(current_user.id, data.recipient_user_id)

@router.get("", response_model=PaginatedResponse[ChatOut])
async def list_user_chats(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = ChatService(db)
    skip = (page - 1) * limit
    items, total = await service.get_user_chats(current_user.id, skip=skip, limit=limit)
    pages = (total + limit - 1) // limit if total > 0 else 1
    return PaginatedResponse(items=items, total=total, page=page, limit=limit, pages=pages)

@router.get("/{chat_id}/messages", response_model=PaginatedResponse[MessageOut])
async def get_chat_messages(
    chat_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = ChatService(db)
    skip = (page - 1) * limit
    items, total = await service.get_chat_messages(current_user.id, chat_id, skip=skip, limit=limit)
    pages = (total + limit - 1) // limit if total > 0 else 1
    return PaginatedResponse(items=items, total=total, page=page, limit=limit, pages=pages)

@router.post("/{chat_id}/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def send_message_http(
    chat_id: uuid.UUID,
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    data.chat_id = chat_id
    service = ChatService(db)
    msg = await service.send_message(current_user.id, data)
    
    msg_dict = {
        "id": str(msg.id),
        "chat_id": str(msg.chat_id),
        "sender_id": str(msg.sender_id),
        "type": msg.type.value,
        "content": msg.content,
        "created_at": msg.created_at.isoformat()
    }
    chat = await service.chat_repo.get_chat_with_participants(chat_id)
    if chat:
        for p in chat.participants:
            if p.user_id != current_user.id:
                await ws_manager.send_to_user(p.user_id, msg_dict)

    return msg

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    try:
        payload = decode_token(token)
        user_id = uuid.UUID(payload.get("sub"))
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await ws_manager.connect(user_id, websocket)
    try:
        while True:
            raw_data = await websocket.receive_text()
            import json
            data_json = json.loads(raw_data)
            chat_id = uuid.UUID(data_json.get("chat_id"))
            content = data_json.get("content")
            msg_type = data_json.get("type", "text")

            async with AsyncSessionLocal() as db:
                service = ChatService(db)
                req = MessageCreate(chat_id=chat_id, type=msg_type, content=content)
                msg = await service.send_message(user_id, req)
                
                msg_payload = {
                    "id": str(msg.id),
                    "chat_id": str(msg.chat_id),
                    "sender_id": str(msg.sender_id),
                    "type": msg.type.value,
                    "content": msg.content,
                    "created_at": msg.created_at.isoformat()
                }
                chat = await service.chat_repo.get_chat_with_participants(chat_id)
                if chat:
                    for p in chat.participants:
                        await ws_manager.send_to_user(p.user_id, msg_payload)
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id, websocket)
    except Exception:
        ws_manager.disconnect(user_id, websocket)
