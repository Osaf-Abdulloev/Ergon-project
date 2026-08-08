# HamKor — Job Search Platform Backend

HamKor is a high-load, production-grade backend for a two-sided job search marketplace connecting **workers** and **employers** in Tajikistan.

---

## Tech Stack

- **Language**: Python 3.12+
- **Framework**: FastAPI
- **Database**: PostgreSQL with SQLAlchemy 2.0 (Async) & Alembic
- **Validation**: Pydantic v2
- **Auth**: JWT (Access + Refresh Token Rotation), Bcrypt, RBAC
- **Cache & Broker**: Redis & Celery 5.3+
- **Real-Time**: Native WebSockets with Redis presence tracking
- **Integrations**: Telegram Bot API, SMTP Email Service, AI Assistant Module

---

## Setup & Running

### 1. Requirements Installation
```bash
pip install -r requirements.txt
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and adjust database, Redis, and integration credentials:
```bash
cp .env.example .env
```

### 3. Database Migrations
Run Alembic migrations to initialize the PostgreSQL schema:
```bash
alembic upgrade head
```

### 4. Running the Platform
Launch the API server and Celery background workers using the multi-process supervisor:
```bash
python run.py
```

- **Interactive API Documentation (Swagger)**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`

---

## Running Automated Tests

Run the test suite using pytest:
```bash
python -m pytest
```

---

## Project Structure

```
backend/
├── app/
│   ├── main.py
│   ├── core/            # Settings, security, exceptions
│   ├── database/        # Async Engine, session, base models
│   ├── models/          # SQLAlchemy 2.0 models & enums
│   ├── schemas/         # Pydantic v2 request & response models
│   ├── api/             # Versioned API routers (v1)
│   ├── services/        # Business logic layer
│   ├── repositories/    # Data access layer
│   ├── auth/            # JWT & RBAC dependencies
│   ├── websocket/       # WebSocket connection manager & presence
│   ├── celery/          # Celery configuration & background tasks
│   ├── telegram/        # Telegram Bot integration
│   ├── ai/              # AI Provider adapter & tool bindings
│   └── utils/           # Storage service & email helpers
├── alembic/             # Database migrations
├── tests/               # Pytest test suite
├── .env
├── .env.example
├── requirements.txt
├── run.py
├── PROJECT_DEVELOPMENT_LOG.md
└── README.md
```
