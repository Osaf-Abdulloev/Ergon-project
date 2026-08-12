import asyncio
import logging
from typing import Dict, Any, Optional

from app.celery.app import celery_app

logger = logging.getLogger("celery.tasks")


# ---------------------------------------------------------------------------
# Helper: run async code inside synchronous Celery worker
# ---------------------------------------------------------------------------
def _run_async(coro):
    """Run an async coroutine in a new event loop (safe for sync Celery workers)."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        try:
            loop.close()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# EMAIL TASKS
# ---------------------------------------------------------------------------
@celery_app.task(
    bind=True,
    name="app.celery.tasks.send_email_task",
    max_retries=5,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
    soft_time_limit=30,
    time_limit=60,
)
def send_email_task(self, to_email: str, subject: str, body_html: str):
    """Send a generic email via SMTP. Retries on transient failures."""
    logger.info(
        "send_email_task started | task_id=%s to=%s subject=%s retry=%s",
        self.request.id, to_email, subject[:50], self.request.retries,
    )
    from app.utils.email import send_email_sync

    success = send_email_sync(to_email, subject, body_html)
    if not success:
        raise RuntimeError(f"SMTP send failed for {to_email}")

    logger.info("send_email_task completed | task_id=%s to=%s", self.request.id, to_email)
    return {"status": "sent", "to": to_email}


@celery_app.task(
    bind=True,
    name="app.celery.tasks.send_welcome_email_task",
    max_retries=3,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True,
    soft_time_limit=30,
    time_limit=60,
)
def send_welcome_email_task(self, to_email: str, user_name: str = ""):
    """Send a rich HTML welcome email upon registration."""
    logger.info(
        "send_welcome_email_task started | task_id=%s to=%s retry=%s",
        self.request.id, to_email, self.request.retries,
    )
    from app.services.email_service import EmailService

    success = EmailService.send_welcome_email(to_email, user_name)
    if not success:
        raise RuntimeError(f"Welcome email send failed for {to_email}")

    logger.info("send_welcome_email_task completed | task_id=%s to=%s", self.request.id, to_email)
    return {"status": "sent", "to": to_email}


@celery_app.task(
    bind=True,
    name="app.celery.tasks.send_verification_email_task",
    max_retries=5,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
    soft_time_limit=30,
    time_limit=60,
)
def send_verification_email_task(self, to_email: str, code: str):
    """Send 6-digit email verification OTP code."""
    logger.info(
        "send_verification_email_task started | task_id=%s to=%s retry=%s",
        self.request.id, to_email, self.request.retries,
    )
    from app.services.email_service import EmailService

    success = EmailService.send_verification_code_email(to_email, code)
    if not success:
        logger.warning(f"Verification email send failed for {to_email} (check SMTP settings)")

    logger.info("send_verification_email_task completed | task_id=%s to=%s", self.request.id, to_email)
    return {"status": "processed", "to": to_email}


@celery_app.task(
    bind=True,
    name="app.celery.tasks.send_application_status_email_task",
    max_retries=3,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=180,
    retry_jitter=True,
    soft_time_limit=30,
    time_limit=60,
)
def send_application_status_email_task(self, to_email: str, job_title: str, status_ru: str, feedback: str = ""):
    """Send application status change notification email."""
    logger.info(
        "send_application_status_email_task started | task_id=%s to=%s status=%s retry=%s",
        self.request.id, to_email, status_ru, self.request.retries,
    )
    from app.services.email_service import EmailService

    success = EmailService.send_application_status_email(to_email, job_title, status_ru, feedback)
    if not success:
        logger.warning(f"Application status email send failed for {to_email}")

    logger.info("send_application_status_email_task completed | task_id=%s to=%s", self.request.id, to_email)
    return {"status": "processed", "to": to_email}


# ---------------------------------------------------------------------------
# TELEGRAM TASK
# ---------------------------------------------------------------------------
@celery_app.task(
    bind=True,
    name="app.celery.tasks.send_telegram_notification_task",
    max_retries=3,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=120,
    retry_jitter=True,
    soft_time_limit=15,
    time_limit=30,
)
def send_telegram_notification_task(self, text: str, target_chat_id: str):
    """Send a Telegram message via the bot API. Retries on failure."""
    logger.info(
        "send_telegram_notification_task started | task_id=%s chat=%s retry=%s",
        self.request.id, target_chat_id, self.request.retries,
    )
    from app.telegram.bot import telegram_bot

    if not target_chat_id or not telegram_bot.token:
        logger.warning("send_telegram_notification_task: missing bot token or target chat_id")
        return {"status": "skipped", "chat_id": target_chat_id, "reason": "Missing token or chat_id"}

    success = telegram_bot.send_message_sync(text, target_chat_id)
    if not success:
        raise RuntimeError(f"Telegram send failed for chat_id={target_chat_id}")

    logger.info(
        "send_telegram_notification_task completed | task_id=%s chat=%s",
        self.request.id, target_chat_id,
    )
    return {"status": "sent", "chat_id": target_chat_id}


# ---------------------------------------------------------------------------
# NOTIFICATION DISPATCHER (fan-out to email + telegram)
# ---------------------------------------------------------------------------
@celery_app.task(
    bind=True,
    name="app.celery.tasks.dispatch_notification_task",
    max_retries=3,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True,
    soft_time_limit=30,
    time_limit=60,
)
def dispatch_notification_task(
    self,
    user_id: str,
    title: str,
    body: str,
    notification_type: str = "system",
    payload: Optional[Dict[str, Any]] = None,
):
    """
    Dispatch external notifications (Email + Telegram) for a user.
    DB persistence and WebSocket delivery happen synchronously in the request.
    This task handles the slow I/O: email and Telegram.
    """
    logger.info(
        "dispatch_notification_task started | task_id=%s user=%s type=%s retry=%s",
        self.request.id, user_id, notification_type, self.request.retries,
    )

    async def _dispatch():
        from app.database.session import AsyncSessionLocal
        from sqlalchemy import select
        from app.models.domain import User, UserSettings

        async with AsyncSessionLocal() as session:
            # Fetch user
            import uuid as _uuid
            uid = _uuid.UUID(user_id)
            stmt = select(User).where(User.id == uid)
            res = await session.execute(stmt)
            user = res.scalar_one_or_none()
            if not user:
                logger.warning("dispatch_notification_task: user %s not found", user_id)
                return

            # Fetch user settings
            stmt_set = select(UserSettings).where(UserSettings.user_id == uid)
            res_set = await session.execute(stmt_set)
            user_settings = res_set.scalar_one_or_none()

            email_enabled = user_settings.email_notifications if user_settings else True

            # Fan out to Telegram (numeric chat_id or @username)
            tg_target = user.telegram_chat_id or (f"@{user.telegram_username.replace('@', '')}" if user.telegram_username else None)
            if tg_target:
                tg_text = f"\U0001f514 <b>{title}</b>\n\n{body}\n\n<i>Платформа поиска работы HamKor.tj</i>"
                send_telegram_notification_task.delay(tg_text, tg_target)

            # Fan out to Email
            if email_enabled and user.email:
                email_body = f"<p>{body}</p><p><small>Перейдите на HamKor.tj для подробной информации.</small></p>"
                send_email_task.delay(user.email, f"HamKor: {title}", email_body)

    _run_async(_dispatch())

    logger.info("dispatch_notification_task completed | task_id=%s user=%s", self.request.id, user_id)
    return {"status": "dispatched", "user_id": user_id}


# ---------------------------------------------------------------------------
# AI ANALYSIS TASK
# ---------------------------------------------------------------------------
@celery_app.task(
    bind=True,
    name="app.celery.tasks.ai_analysis_task",
    max_retries=2,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True,
    soft_time_limit=120,
    time_limit=180,
)
def ai_analysis_task(self, user_id: str, prompt: str, task_type: str):
    """Run an AI analysis task in the background."""
    logger.info(
        "ai_analysis_task started | task_id=%s user=%s type=%s retry=%s",
        self.request.id, user_id, task_type, self.request.retries,
    )
    result = f"AI Analysis Completed for {task_type}. Results generated for prompt: {prompt[:50]}..."
    logger.info("ai_analysis_task completed | task_id=%s user=%s", self.request.id, user_id)
    return {"status": "completed", "user_id": user_id, "result": result}


# ---------------------------------------------------------------------------
# SCRAPER / SYNC TASKS
# ---------------------------------------------------------------------------
@celery_app.task(
    bind=True,
    name="app.celery.tasks.sync_yora_vacancies_task",
    max_retries=3,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
    soft_time_limit=300,
    time_limit=600,
)
def sync_yora_vacancies_task(self, max_pages: int = None):
    """Fetch and sync job vacancies from yora.tj."""
    logger.info(
        "sync_yora_vacancies_task started | task_id=%s max_pages=%s retry=%s",
        self.request.id, max_pages, self.request.retries,
    )

    async def _run():
        from app.database.session import AsyncSessionLocal
        from app.services.yora_parser import YoraParserService

        async with AsyncSessionLocal() as session:
            parser = YoraParserService(session)
            return await parser.fetch_and_sync(max_pages=max_pages)

    stats = _run_async(_run())
    logger.info(
        "sync_yora_vacancies_task completed | task_id=%s stats=%s",
        self.request.id, stats,
    )
    return {"status": "success", "stats": stats}


@celery_app.task(
    bind=True,
    name="app.celery.tasks.sync_yora_candidates_task",
    max_retries=3,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
    soft_time_limit=300,
    time_limit=600,
)
def sync_yora_candidates_task(self):
    """Fetch and sync candidate profiles from yora.tj."""
    logger.info(
        "sync_yora_candidates_task started | task_id=%s retry=%s",
        self.request.id, self.request.retries,
    )

    async def _run():
        from app.database.session import AsyncSessionLocal
        from app.services.yora_candidate_parser import YoraCandidateParserService

        async with AsyncSessionLocal() as session:
            parser = YoraCandidateParserService(session)
            return await parser.sync_candidates()

    stats = _run_async(_run())
    logger.info(
        "sync_yora_candidates_task completed | task_id=%s stats=%s",
        self.request.id, stats,
    )
    return {"status": "success", "stats": stats}


@celery_app.task(
    bind=True,
    name="app.celery.tasks.sync_telegram_vacancies_task",
    max_retries=3,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
    soft_time_limit=300,
    time_limit=600,
)
def sync_telegram_vacancies_task(self, max_pages: int = 5):
    """Fetch and sync job vacancies from Telegram channels."""
    logger.info(
        "sync_telegram_vacancies_task started | task_id=%s max_pages=%s retry=%s",
        self.request.id, max_pages, self.request.retries,
    )

    async def _run():
        from app.database.session import AsyncSessionLocal
        from app.services.telegram_parser import TelegramParserService

        async with AsyncSessionLocal() as session:
            parser = TelegramParserService(session)
            return await parser.fetch_and_sync(max_pages=max_pages)

    stats = _run_async(_run())
    logger.info(
        "sync_telegram_vacancies_task completed | task_id=%s stats=%s",
        self.request.id, stats,
    )
    return {"status": "success", "stats": stats}


@celery_app.task(
    bind=True,
    name="app.celery.tasks.sync_somon_vacancies_task",
    max_retries=3,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
    soft_time_limit=300,
    time_limit=600,
)
def sync_somon_vacancies_task(self, max_pages: int = 10):
    """Fetch and sync job vacancies from somon.tj."""
    logger.info(
        "sync_somon_vacancies_task started | task_id=%s max_pages=%s retry=%s",
        self.request.id, max_pages, self.request.retries,
    )

    async def _run():
        from app.database.session import AsyncSessionLocal
        from app.services.somon_parser import SomonParserService

        async with AsyncSessionLocal() as session:
            parser = SomonParserService(session)
            return await parser.fetch_and_sync(max_pages=max_pages)

    stats = _run_async(_run())
    logger.info(
        "sync_somon_vacancies_task completed | task_id=%s stats=%s",
        self.request.id, stats,
    )
    return {"status": "success", "stats": stats}

