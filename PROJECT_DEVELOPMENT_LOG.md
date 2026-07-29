# Ergon Job Search Platform — Development Log

## 2026-07-29

### What was done
- Completed **Milestone 1, 2, 3, 4, 5, 6, and 7**: Architected and implemented the full production-ready backend for **Ergon**, a two-sided job marketplace connecting workers and employers.
- Built a clean layered FastAPI monolith without any frontend templates or static file dependencies.
- Designed a normalized PostgreSQL schema with 13 entities (`User`, `WorkerProfile`, `Skill`, `WorkerSkill`, `Experience`, `Company`, `Job`, `Application`, `Favorite`, `Chat`, `ChatParticipant`, `Message`, `Notification`, and token tables).
- Built JWT authentication with short-lived access tokens and rotated refresh tokens, Bcrypt password hashing, RBAC dependencies, and email verification / password reset workflows.
- Implemented Worker and Employer profiles, job management, filterable indexed search (`?page=&limit=`), application management with unique application constraints, and compound favorite bookmarking.
- Implemented file storage abstraction (`FileStorageService`) with local disk backing, MIME content inspection, size limits, and authenticated streaming endpoints.
- Implemented WebSocket real-time chat with JWT handshake authentication, Redis-backed presence tracking, and paginated message history.
- Designed a unified notification service fanning out asynchronously via Celery workers to In-App notifications, SMTP Email, and Telegram Bot API.
- Implemented an isolated AI Assistant module (`app/ai/`) with provider-agnostic interface, callable tool bindings (`search_jobs`, `search_workers`, `get_user_profile`, `analyze_resume`, `recommend_jobs`, `recommend_candidates`), and Celery async analysis.
- Built admin moderation, company verification, and platform analytics endpoints.
- Provided `run.py` multi-process supervisor for launching Uvicorn API server and Celery background workers synchronously.
- Built a full test suite with `pytest` and `httpx.AsyncClient`.

### Technologies used
- **Python 3.12+** & **FastAPI**
- **PostgreSQL**, **SQLAlchemy 2.0 Async**, & **Alembic**
- **Pydantic v2** & **Pydantic Settings**
- **Redis** & **Celery 5.3+**
- **Native FastAPI WebSockets**
- **Telegram Bot API** (via `httpx`)
- **SMTP Email Service**
- **Pytest** & **pytest-asyncio**

### Why this approach was chosen
1. **FastAPI Monolith over Microservices**: A cohesive monolith minimizes deployment complexity, latency, and overhead while providing strict domain isolation through structured module boundaries (`repositories/`, `services/`, `api/`).
2. **SQLAlchemy 2.0 Async & Explicit Models**: Avoids blocking IO on database operations while strictly typing domain entities with `Mapped[...]` annotations and enforcing integrity constraints at the database level.
3. **Refresh Token Rotation**: Enhances security by revoking the old refresh token on every use and invalidating all tokens for a user if reuse of a revoked token is detected.
4. **Abstract FileStorageService**: Decouples business logic from disk storage, enabling seamless migration to S3 or GCS in production without modifying routers or services.
5. **Celery Task Queues for External Integrations**: Network calls to Telegram Bot API or SMTP servers can fail or delay requests; running them in Celery background tasks prevents blocking HTTP worker threads.

### Files changed
- `requirements.txt`
- `.env`, `.env.example`
- `run.py`
- `alembic.ini`, `alembic/env.py`, `alembic/script.py.mako`
- `app/main.py`
- `app/core/config.py`, `app/core/security.py`, `app/core/exceptions.py`
- `app/database/session.py`, `app/database/base.py`
- `app/models/enums.py`, `app/models/domain.py`, `app/models/__init__.py`
- `app/schemas/common.py`, `app/schemas/auth.py`, `app/schemas/user.py`, `app/schemas/profile.py`, `app/schemas/job.py`, `app/schemas/application.py`, `app/schemas/favorite.py`, `app/schemas/chat.py`, `app/schemas/notification.py`, `app/schemas/ai.py`
- `app/repositories/base.py`, `app/repositories/user.py`, `app/repositories/profile.py`, `app/repositories/job.py`, `app/repositories/application.py`, `app/repositories/favorite.py`, `app/repositories/chat.py`, `app/repositories/notification.py`
- `app/services/auth.py`, `app/services/user.py`, `app/services/job.py`, `app/services/application.py`, `app/services/favorite.py`, `app/services/chat.py`, `app/services/notification.py`
- `app/auth/deps.py`
- `app/utils/storage.py`, `app/utils/email.py`
- `app/telegram/bot.py`
- `app/celery/app.py`, `app/celery/tasks.py`
- `app/ai/tools.py`, `app/ai/service.py`
- `app/websocket/manager.py`
- `app/api/v1/auth.py`, `app/api/v1/users.py`, `app/api/v1/jobs.py`, `app/api/v1/applications.py`, `app/api/v1/favorites.py`, `app/api/v1/chat.py`, `app/api/v1/notifications.py`, `app/api/v1/files.py`, `app/api/v1/ai.py`, `app/api/v1/admin.py`
- `tests/conftest.py`, `tests/test_auth.py`, `tests/test_jobs.py`, `tests/test_chat.py`, `tests/test_search.py`
- `PROJECT_DEVELOPMENT_LOG.md`
- `README.md`

### What to study next
- Advanced PostgreSQL full-text search with `tsvector` and `pg_trgm` indexes for fuzzy Tajik & Russian text matching.
- S3 / MinIO storage adapter implementation for distributed cloud file storage.
- Rate limiting middleware using Redis sliding window counters for auth endpoints.
