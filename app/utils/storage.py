import os
import uuid
import abc
from typing import Tuple
from fastapi import UploadFile
from app.core.config import settings
from app.core.exceptions import AppException

class BaseStorageService(abc.ABC):
    @abc.abstractmethod
    async def save_file(self, file: UploadFile, folder: str = "general") -> Tuple[str, str]:
        pass

    @abc.abstractmethod
    async def delete_file(self, file_path: str) -> bool:
        pass

class LocalStorageService(BaseStorageService):
    def __init__(self, base_path: str = settings.FILE_STORAGE_PATH):
        self.base_path = base_path
        os.makedirs(self.base_path, exist_ok=True)

    async def save_file(self, file: UploadFile, folder: str = "general") -> Tuple[str, str]:
        content = await file.read()
        file_size_mb = len(content) / (1024 * 1024)
        if file_size_mb > settings.MAX_UPLOAD_SIZE_MB:
            raise AppException(f"File size exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_MB}MB")

        mime_type = file.content_type or "application/octet-stream"
        ext = os.path.splitext(file.filename or "")[1]
        random_filename = f"{uuid.uuid4().hex}{ext}"
        folder_path = os.path.join(self.base_path, folder)
        os.makedirs(folder_path, exist_ok=True)

        file_path = os.path.join(folder_path, random_filename)
        with open(file_path, "wb") as f:
            f.write(content)

        relative_path = f"{folder}/{random_filename}"
        return relative_path, mime_type

    async def delete_file(self, file_path: str) -> bool:
        full_path = os.path.join(self.base_path, file_path)
        if os.path.exists(full_path):
            os.remove(full_path)
            return True
        return False

storage_service: BaseStorageService = LocalStorageService()
