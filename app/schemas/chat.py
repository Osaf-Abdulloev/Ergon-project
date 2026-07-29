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

class MessageOut(BaseModel):
    id: uuid.UUID
    chat_id: uuid.UUID
    sender_id: uuid.UUID
    type: MessageType
    content: str
    is_read: bool
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

    model_config = ConfigDict(from_attributes=True)

class CreateChatRequest(BaseModel):
    recipient_user_id: uuid.UUID
