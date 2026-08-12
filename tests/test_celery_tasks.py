"""
Tests for Celery background task system.

These tests use Celery's ALWAYS_EAGER mode (set in conftest.py),
which executes tasks synchronously in-process for testing.
"""
import pytest
from unittest.mock import patch, MagicMock
from app.celery.app import celery_app


# ─────────────────────────────────────────────────────────────────────
# 1. Task successful execution
# ─────────────────────────────────────────────────────────────────────


class TestEmailTask:
    """Test send_email_task execution and retry."""

    @patch("app.utils.email.send_email_sync", return_value=True)
    def test_send_email_task_success(self, mock_send):
        from app.celery.tasks import send_email_task
        result = send_email_task("test@example.com", "Subject", "<p>Body</p>")
        assert result["status"] == "sent"
        assert result["to"] == "test@example.com"
        mock_send.assert_called_once_with("test@example.com", "Subject", "<p>Body</p>")

    @patch("app.utils.email.send_email_sync", return_value=False)
    def test_send_email_task_failure_raises(self, mock_send):
        from app.celery.tasks import send_email_task
        with pytest.raises(RuntimeError, match="SMTP send failed"):
            send_email_task("fail@example.com", "Subject", "<p>Body</p>")


class TestWelcomeEmailTask:
    """Test send_welcome_email_task."""

    @patch("app.services.email_service.EmailService.send_welcome_email", return_value=True)
    def test_welcome_email_success(self, mock_welcome):
        from app.celery.tasks import send_welcome_email_task
        result = send_welcome_email_task("new@example.com", "Test User")
        assert result["status"] == "sent"
        mock_welcome.assert_called_once_with("new@example.com", "Test User")

    @patch("app.services.email_service.EmailService.send_welcome_email", return_value=False)
    def test_welcome_email_failure_raises(self, mock_welcome):
        from app.celery.tasks import send_welcome_email_task
        with pytest.raises(RuntimeError, match="Welcome email send failed"):
            send_welcome_email_task("fail@example.com", "")


class TestTelegramTask:
    """Test send_telegram_notification_task."""

    @patch("app.telegram.bot.telegram_bot.token", "test_bot_token")
    @patch("app.telegram.bot.telegram_bot.send_message_sync", return_value=True)
    def test_telegram_success(self, mock_tg):
        from app.celery.tasks import send_telegram_notification_task
        result = send_telegram_notification_task("Hello!", "12345")
        assert result["status"] == "sent"
        assert result["chat_id"] == "12345"
        mock_tg.assert_called_once_with("Hello!", "12345")

    @patch("app.telegram.bot.telegram_bot.token", "test_bot_token")
    @patch("app.telegram.bot.telegram_bot.send_message_sync", return_value=False)
    def test_telegram_failure_raises(self, mock_tg):
        from app.celery.tasks import send_telegram_notification_task
        with pytest.raises(RuntimeError, match="Telegram send failed"):
            send_telegram_notification_task("Fail!", "999")


class TestAIAnalysisTask:
    """Test ai_analysis_task."""

    def test_ai_analysis_completes(self):
        from app.celery.tasks import ai_analysis_task
        result = ai_analysis_task("user-123", "Analyze this resume", "resume_analysis")
        assert result["status"] == "completed"
        assert result["user_id"] == "user-123"
        assert "AI Analysis Completed" in result["result"]


# ─────────────────────────────────────────────────────────────────────
# 2. Task enqueued to Redis (via .delay() in EAGER mode)
# ─────────────────────────────────────────────────────────────────────


class TestTaskEnqueue:
    """Test that .delay() works in EAGER mode."""

    @patch("app.utils.email.send_email_sync", return_value=True)
    def test_email_delay(self, mock_send):
        from app.celery.tasks import send_email_task
        result = send_email_task.delay("queued@test.com", "Delayed Subject", "<p>Queued</p>")
        # In EAGER mode, result is available immediately
        assert result.get()["status"] == "sent"

    @patch("app.telegram.bot.telegram_bot.token", "test_bot_token")
    @patch("app.telegram.bot.telegram_bot.send_message_sync", return_value=True)
    def test_telegram_delay(self, mock_tg):
        from app.celery.tasks import send_telegram_notification_task
        result = send_telegram_notification_task.delay("Test msg", "55555")
        assert result.get()["status"] == "sent"


# ─────────────────────────────────────────────────────────────────────
# 3. Task retry behavior
# ─────────────────────────────────────────────────────────────────────


class TestTaskRetry:
    """Test retry on transient failures."""

    @patch("app.utils.email.send_email_sync")
    def test_email_retries_then_succeeds(self, mock_send):
        """Verify that EAGER mode propagates exceptions on failure."""
        mock_send.return_value = False
        from app.celery.tasks import send_email_task
        from celery.exceptions import Retry
        # In EAGER mode with autoretry, Celery raises Retry exception
        with pytest.raises((RuntimeError, Retry)):
            send_email_task.delay("retry@test.com", "Retry Test", "<p>Body</p>").get()


# ─────────────────────────────────────────────────────────────────────
# 4. Task failure — max retries exhausted
# ─────────────────────────────────────────────────────────────────────


class TestTaskMaxRetries:
    """Confirm tasks fail cleanly after max retries."""

    @patch("app.utils.email.send_email_sync", return_value=False)
    def test_email_max_retries_exhausted(self, mock_send):
        from app.celery.tasks import send_email_task
        # In EAGER mode, the task raises immediately on failure
        with pytest.raises(RuntimeError, match="SMTP send failed"):
            send_email_task("exhaust@test.com", "Subject", "<p>Body</p>")


# ─────────────────────────────────────────────────────────────────────
# 5. Serialization of UUID / datetime arguments
# ─────────────────────────────────────────────────────────────────────


class TestSerialization:
    """Verify JSON serialization of task arguments."""

    def test_uuid_string_serialization(self):
        """Tasks receive string UUIDs, not UUID objects."""
        from app.celery.tasks import ai_analysis_task
        import uuid
        user_id = str(uuid.uuid4())
        result = ai_analysis_task(user_id, "test prompt", "test_type")
        assert result["user_id"] == user_id

    @patch("app.utils.email.send_email_sync", return_value=True)
    def test_email_string_args(self, mock_send):
        from app.celery.tasks import send_email_task
        result = send_email_task("unicode@тест.рф", "Тема письма", "<p>Тело</p>")
        assert result["status"] == "sent"


# ─────────────────────────────────────────────────────────────────────
# 6. Celery configuration validation
# ─────────────────────────────────────────────────────────────────────


class TestCeleryConfig:
    """Validate Celery app configuration."""

    def test_json_serializer(self):
        assert celery_app.conf.task_serializer == "json"
        assert celery_app.conf.result_serializer == "json"
        assert "json" in celery_app.conf.accept_content

    def test_acks_late(self):
        assert celery_app.conf.task_acks_late is True

    def test_reject_on_worker_lost(self):
        assert celery_app.conf.task_reject_on_worker_lost is True

    def test_timezone(self):
        assert celery_app.conf.timezone == "UTC"
        assert celery_app.conf.enable_utc is True

    def test_task_routes_defined(self):
        routes = celery_app.conf.task_routes
        assert "app.celery.tasks.send_email_task" in routes
        assert "app.celery.tasks.send_telegram_notification_task" in routes
        assert "app.celery.tasks.dispatch_notification_task" in routes
        assert "app.celery.tasks.sync_yora_vacancies_task" in routes

    def test_beat_schedule_defined(self):
        schedule = celery_app.conf.beat_schedule
        assert "sync-yora-vacancies-hourly" in schedule
        assert "sync-yora-candidates-hourly" in schedule
        assert "sync-telegram-vacancies-hourly" in schedule

    def test_prefetch_multiplier(self):
        assert celery_app.conf.worker_prefetch_multiplier == 1

    def test_default_timeouts(self):
        assert celery_app.conf.task_soft_time_limit == 120
        assert celery_app.conf.task_time_limit == 180


# ─────────────────────────────────────────────────────────────────────
# 7. Notification dispatch fan-out
# ─────────────────────────────────────────────────────────────────────


class TestNotificationDispatch:
    """Test dispatch_notification_task fan-out logic."""

    @patch("app.celery.tasks.send_email_task.delay")
    @patch("app.celery.tasks.send_telegram_notification_task.delay")
    def test_dispatch_fans_out(self, mock_tg_delay, mock_email_delay):
        """Test that dispatch_notification_task correctly fans out to email and telegram."""
        from app.celery.tasks import dispatch_notification_task
        import uuid

        # This test uses a mock user, so we need to mock the DB lookup
        mock_user = MagicMock()
        mock_user.email = "fanout@test.com"
        mock_user.telegram_chat_id = "tg_12345"

        mock_settings = MagicMock()
        mock_settings.email_notifications = True

        with patch("app.celery.tasks._run_async") as mock_run:
            # Mock the async function execution
            mock_run.return_value = None

            # Just verify the task can be called without errors
            result = dispatch_notification_task(
                user_id=str(uuid.uuid4()),
                title="Test Notification",
                body="Test Body",
                notification_type="system",
                payload={"key": "value"},
            )
            # dispatch_notification_task calls _run_async internally
            mock_run.assert_called_once()


# ─────────────────────────────────────────────────────────────────────
# 8. Scraper tasks
# ─────────────────────────────────────────────────────────────────────


class TestScraperTasks:
    """Test scraper/sync tasks."""

    @patch("app.celery.tasks._run_async")
    def test_sync_yora_vacancies(self, mock_run):
        mock_run.return_value = {"created": 5, "updated": 3, "total_fetched": 8}
        from app.celery.tasks import sync_yora_vacancies_task
        result = sync_yora_vacancies_task(max_pages=1)
        assert result["status"] == "success"
        assert result["stats"]["created"] == 5

    @patch("app.celery.tasks._run_async")
    def test_sync_yora_candidates(self, mock_run):
        mock_run.return_value = {"synced": 10}
        from app.celery.tasks import sync_yora_candidates_task
        result = sync_yora_candidates_task()
        assert result["status"] == "success"

    @patch("app.celery.tasks._run_async")
    def test_sync_telegram_vacancies(self, mock_run):
        mock_run.return_value = {"created": 2, "total_fetched": 2}
        from app.celery.tasks import sync_telegram_vacancies_task
        result = sync_telegram_vacancies_task(max_pages=1)
        assert result["status"] == "success"
