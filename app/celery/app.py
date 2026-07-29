from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "ergon_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_routes={
        "app.celery.tasks.send_email_task": {"queue": "notifications"},
        "app.celery.tasks.send_telegram_task": {"queue": "notifications"},
        "app.celery.tasks.send_notification_task": {"queue": "notifications"},
        "app.celery.tasks.ai_analysis_task": {"queue": "ai_tasks"},
    }
)
