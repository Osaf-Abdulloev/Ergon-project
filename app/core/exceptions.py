from fastapi import HTTPException, status

class AppException(HTTPException):
    def __init__(self, detail: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        super().__init__(status_code=status_code, detail=detail)

class BadRequestException(AppException):
    def __init__(self, detail: str = "Bad request"):
        super().__init__(detail=detail, status_code=status.HTTP_400_BAD_REQUEST)


class NotFoundException(AppException):
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(detail=detail, status_code=status.HTTP_404_NOT_FOUND)

class UnauthorizedException(AppException):
    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(detail=detail, status_code=status.HTTP_401_UNAUTHORIZED)

class ForbiddenException(AppException):
    def __init__(self, detail: str = "Operation not permitted"):
        super().__init__(detail=detail, status_code=status.HTTP_403_FORBIDDEN)

class ConflictException(AppException):
    def __init__(self, detail: str = "Resource conflict"):
        super().__init__(detail=detail, status_code=status.HTTP_409_CONFLICT)

from typing import Any

class UnverifiedUserException(AppException):
    def __init__(self, detail: Any = "Email verification required"):
        super().__init__(detail=detail, status_code=status.HTTP_403_FORBIDDEN)

