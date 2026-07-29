import asyncio
from typing import Dict, Any
from app.celery.app import celery_app
from app.utils.email import send_email_sync
from app.telegram.bot import telegram_bot

@celery_app.task(bind=True, max_retries=3, default_retry_delay=5)
def send_email_task(self, to_email: str, subject: str, body_html: str):
    try:
        success = send_email_sync(to_email, subject, body_html)
        if not success:
            raise Exception("SMTP Email send failed")
        return {"status": "success", "to": to_email}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)

@celery_app.task(bind=True, max_retries=3, default_retry_delay=5)
def send_telegram_task(self, text: str, target_chat_id: str = None):
    try:
        success = telegram_bot.send_message_sync(text, target_chat_id)
        if not success:
            raise Exception("Telegram API message send failed")
        return {"status": "success"}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)

@celery_app.task(bind=True, max_retries=3, default_retry_delay=5)
def send_notification_task(self, user_id: str, notification_type: str, payload: Dict[str, Any], email: str = None, telegram_chat_id: str = None):
    try:
        text_summary = f"Notification [{notification_type}]: {payload}"
        if telegram_chat_id:
            send_telegram_task.delay(text_summary, telegram_chat_id)
        if email:
            send_email_task.delay(email, f"Ergon Notification: {notification_type}", f"<p>{text_summary}</p>")
        return {"status": "fanned_out", "user_id": user_id}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)

@celery_app.task(bind=True, max_retries=2, default_retry_delay=10)
def ai_analysis_task(self, user_id: str, prompt: str, task_type: str):
    try:
        res = f"AI Analysis Completed for {task_type}. Results generated for prompt: {prompt[:50]}..."
        return {"status": "completed", "user_id": user_id, "result": res}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)
