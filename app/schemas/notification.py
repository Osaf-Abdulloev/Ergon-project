from datetime import datetime
import uuid
from typing import Any
from pydantic import BaseModel, ConfigDict
from app.models.enums import NotificationType

class NotificationOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    type: NotificationType
    payload: Any
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
