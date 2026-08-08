from datetime import datetime
import uuid
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.enums import MessageType
from app.schemas.user import UserOut

class MessageCreate(BaseModel):
    chat_id: uuid.UUID
    type: MessageType = MessageType.TEXT
    content: str
    client_msg_id: Optional[str] = None

class MessageEditRequest(BaseModel):
    content: str

class MessageOut(BaseModel):
    id: uuid.UUID
    chat_id: uuid.UUID
    sender_id: uuid.UUID
    type: MessageType
    content: str
    is_read: bool
    is_edited: bool = False
    is_deleted: bool = False
    client_msg_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ChatParticipantOut(BaseModel):
    user_id: uuid.UUID
    user: Optional[UserOut] = None

    model_config = ConfigDict(from_attributes=True)

class ChatOut(BaseModel):
    id: uuid.UUID
    created_at: datetime
    participants: List[ChatParticipantOut] = []
    last_message: Optional[MessageOut] = None
    unread_count: int = 0

    model_config = ConfigDict(from_attributes=True)

class CreateChatRequest(BaseModel):
    recipient_user_id: uuid.UUID
