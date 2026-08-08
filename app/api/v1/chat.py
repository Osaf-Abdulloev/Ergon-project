import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db, AsyncSessionLocal
from app.schemas.chat import ChatOut, MessageOut, MessageCreate, MessageEditRequest, CreateChatRequest
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
@router.get("/conversations", response_model=PaginatedResponse[ChatOut])
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
        "event": "new_message",
        "id": str(msg.id),
        "chat_id": str(msg.chat_id),
        "sender_id": str(msg.sender_id),
        "type": msg.type.value,
        "content": msg.content,
        "client_msg_id": msg.client_msg_id,
        "is_read": msg.is_read,
        "is_edited": msg.is_edited,
        "is_deleted": msg.is_deleted,
        "created_at": msg.created_at.isoformat()
    }
    chat = await service.chat_repo.get_chat_with_participants(chat_id)
    if chat:
        p_ids = [p.user_id for p in chat.participants]
        await ws_manager.broadcast_to_participants(p_ids, msg_dict)

        # Notify offline/other participants via NotificationService
        from app.services.notification_service import NotificationService
        from app.models.enums import NotificationType
        for pid in p_ids:
            if pid != current_user.id:
                sender_name = current_user.full_name or current_user.username
                await NotificationService.send_notification(
                    db,
                    pid,
                    f"Новое сообщение от {sender_name}",
                    msg.content[:100] + ("..." if len(msg.content) > 100 else ""),
                    type=NotificationType.SYSTEM
                )

    return msg

@router.patch("/{chat_id}/messages/{message_id}", response_model=MessageOut)
async def edit_message(
    chat_id: uuid.UUID,
    message_id: uuid.UUID,
    data: MessageEditRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = ChatService(db)
    msg = await service.edit_message(current_user.id, message_id, data.content)
    
    payload = {
        "event": "message_edited",
        "id": str(msg.id),
        "chat_id": str(msg.chat_id),
        "content": msg.content,
        "is_edited": True
    }
    chat = await service.chat_repo.get_chat_with_participants(chat_id)
    if chat:
        p_ids = [p.user_id for p in chat.participants]
        await ws_manager.broadcast_to_participants(p_ids, payload)

    return msg

@router.delete("/{chat_id}/messages/{message_id}", response_model=MessageOut)
async def delete_message(
    chat_id: uuid.UUID,
    message_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = ChatService(db)
    msg = await service.delete_message(current_user.id, message_id)

    payload = {
        "event": "message_deleted",
        "id": str(msg.id),
        "chat_id": str(msg.chat_id),
        "is_deleted": True
    }
    chat = await service.chat_repo.get_chat_with_participants(chat_id)
    if chat:
        p_ids = [p.user_id for p in chat.participants]
        await ws_manager.broadcast_to_participants(p_ids, payload)

    return msg

@router.post("/{chat_id}/read")
async def mark_chat_read(
    chat_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = ChatService(db)
    await service.msg_repo.mark_messages_as_read(chat_id, current_user.id)
    await db.commit()

    chat = await service.chat_repo.get_chat_with_participants(chat_id)
    if chat:
        p_ids = [p.user_id for p in chat.participants]
        await ws_manager.broadcast_to_participants(p_ids, {
            "event": "messages_read",
            "chat_id": str(chat_id),
            "reader_id": str(current_user.id)
        })
    return {"status": "success"}

@router.delete("/{chat_id}")
async def delete_chat(
    chat_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = ChatService(db)
    await service.delete_chat(current_user.id, chat_id)
    return {"status": "success", "chat_id": str(chat_id)}

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: Optional[str] = Query(None)):
    if not token or token in ["undefined", "null", "demo_token"]:
        await websocket.accept()
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            pass
        return

    clean_token = token.replace("Bearer ", "").strip()
    try:
        payload = decode_token(clean_token)
        user_id = uuid.UUID(payload.get("sub"))
    except Exception:
        await websocket.accept()
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            pass
        return

    await ws_manager.connect(user_id, websocket)
    try:
        while True:
            raw_data = await websocket.receive_text()
            import json
            data_json = json.loads(raw_data)
            event_type = data_json.get("event", "send_message")

            if event_type == "ping":
                await websocket.send_text(json.dumps({"event": "pong"}))
                continue

            chat_id_str = data_json.get("chat_id")
            if not chat_id_str:
                continue
            chat_id = uuid.UUID(chat_id_str)

            async with AsyncSessionLocal() as db:
                service = ChatService(db)

                if event_type in ["typing_start", "typing_stop"]:
                    chat = await service.chat_repo.get_chat_with_participants(chat_id)
                    if chat:
                        p_ids = [p.user_id for p in chat.participants]
                        await ws_manager.broadcast_to_participants(p_ids, {
                            "event": event_type,
                            "chat_id": str(chat_id),
                            "user_id": str(user_id)
                        })
                    continue

                if event_type == "send_message":
                    content = data_json.get("content", "")
                    msg_type = data_json.get("type", "text")
                    client_msg_id = data_json.get("client_msg_id")

                    req = MessageCreate(chat_id=chat_id, type=msg_type, content=content, client_msg_id=client_msg_id)
                    msg = await service.send_message(user_id, req)

                    msg_payload = {
                        "event": "new_message",
                        "id": str(msg.id),
                        "chat_id": str(msg.chat_id),
                        "sender_id": str(msg.sender_id),
                        "type": msg.type.value,
                        "content": msg.content,
                        "client_msg_id": msg.client_msg_id,
                        "is_read": msg.is_read,
                        "is_edited": msg.is_edited,
                        "is_deleted": msg.is_deleted,
                        "created_at": msg.created_at.isoformat()
                    }
                    chat = await service.chat_repo.get_chat_with_participants(chat_id)
                    if chat:
                        p_ids = [p.user_id for p in chat.participants]
                        await ws_manager.broadcast_to_participants(p_ids, msg_payload)

    except WebSocketDisconnect:
        ws_manager.disconnect(user_id, websocket)
    except Exception:
        ws_manager.disconnect(user_id, websocket)
