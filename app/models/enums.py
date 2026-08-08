import enum

class UserRole(str, enum.Enum):
    WORKER = "worker"
    EMPLOYER = "employer"
    ADMIN = "admin"

class EmploymentType(str, enum.Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    REMOTE = "remote"
    CONTRACT = "contract"
    INTERNSHIP = "internship"

class JobStatus(str, enum.Enum):
    DRAFT = "draft"
    OPEN = "open"
    CLOSED = "closed"

class ApplicationStatus(str, enum.Enum):
    PENDING = "pending"
    REVIEWED = "reviewed"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

class FavoriteTargetType(str, enum.Enum):
    JOB = "job"
    WORKER = "worker"

class MessageType(str, enum.Enum):
    TEXT = "text"
    IMAGE = "image"
    VOICE = "voice"

class NotificationType(str, enum.Enum):
    NEW_APPLICATION = "new_application"
    NEW_MESSAGE = "new_message"
    STATUS_CHANGE = "status_change"
    AI_RECOMMENDATION = "ai_recommendation"
    SYSTEM = "system"

class ResumeStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"

