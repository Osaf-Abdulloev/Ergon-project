import os
from fastapi import APIRouter, Depends, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from app.utils.storage import storage_service
from app.auth.deps import get_current_user
from app.models.domain import User
from app.core.config import settings
from app.core.exceptions import NotFoundException

router = APIRouter(prefix="/files", tags=["File Storage"])

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    folder: str = Form(default="general"),
    current_user: User = Depends(get_current_user)
):
    rel_path, mime_type = await storage_service.save_file(file, folder=folder)
    return {
        "file_url": f"/api/v1/files/{rel_path}",
        "relative_path": rel_path,
        "mime_type": mime_type
    }

@router.get("/{folder}/{filename}")
async def get_file(
    folder: str,
    filename: str,
    current_user: User = Depends(get_current_user)
):
    full_path = os.path.join(settings.FILE_STORAGE_PATH, folder, filename)
    if not os.path.exists(full_path):
        raise NotFoundException("File not found")
    return FileResponse(full_path)
