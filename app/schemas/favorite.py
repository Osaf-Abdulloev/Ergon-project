from datetime import datetime
import uuid
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict
from app.models.enums import FavoriteTargetType

class FavoriteCreate(BaseModel):
    target_type: FavoriteTargetType
    target_id: uuid.UUID

class FavoriteOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    target_type: FavoriteTargetType
    target_id: uuid.UUID
    created_at: datetime
    target_details: Optional[Any] = None

    model_config = ConfigDict(from_attributes=True)
