import os
from fastapi import APIRouter, Depends, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.utils.storage import storage_service
from app.auth.deps import get_current_user
from app.models.domain import User, FileUpload
from app.core.config import settings
from app.core.exceptions import NotFoundException

router = APIRouter(prefix="/files", tags=["File Storage"])

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    folder: str = Form(default="general"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Read size before writing
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)

    rel_path, mime_type = await storage_service.save_file(file, folder=folder)
    file_url = f"/api/v1/files/{rel_path}"

    db_file = FileUpload(
        user_id=current_user.id,
        original_filename=file.filename or "file",
        stored_filename=os.path.basename(rel_path),
        folder=folder,
        mime_type=mime_type,
        file_size=file_size,
        storage_path=rel_path,
        url=file_url
    )
    db.add(db_file)
    await db.commit()
    await db.refresh(db_file)

    return {
        "id": str(db_file.id),
        "url": file_url,
        "file_url": file_url,
        "relative_path": rel_path,
        "mime_type": mime_type,
        "original_filename": db_file.original_filename,
        "file_size": file_size
    }

@router.get("/{folder}/{filename}")
async def get_file(
    folder: str,
    filename: str
):
    full_path = os.path.join(settings.FILE_STORAGE_PATH, folder, filename)
    if not os.path.exists(full_path):
        raise NotFoundException("File not found")
    import mimetypes
    media_type, _ = mimetypes.guess_type(full_path)
    return FileResponse(full_path, media_type=media_type or "application/octet-stream")
