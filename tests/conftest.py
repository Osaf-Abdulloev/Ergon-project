import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.database.base import Base
from app.database.session import get_db
from app.celery.app import celery_app
from app.main import app

celery_app.conf.task_always_eager = True
celery_app.conf.task_eager_propagates = True

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="function")
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture(scope="function")
async def db_session(test_engine):
    session_factory = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()

def get_captured_code(email: str) -> str:
    from app.services.email_service import EmailService
    return EmailService._last_verification_codes.get(email, "")

@pytest.fixture(autouse=True)
def mock_smtp_sending(monkeypatch):
    import app.services.email_service as es_module

    def mock_smtp(msg, to_email: str) -> bool:
        return True

    monkeypatch.setattr(es_module.EmailService, "_send_smtp_message", mock_smtp)
    yield

@pytest.fixture(scope="function")
async def client(db_session):
    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
