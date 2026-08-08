import asyncio
from typing import AsyncGenerator
from urllib.parse import urlparse
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.core.config import settings

def ensure_postgresql_database(url: str) -> bool:
    if not url.startswith("postgresql"):
        return False
    try:
        import asyncpg
        clean_url = url.replace("postgresql+asyncpg://", "postgresql://")
        parsed = urlparse(clean_url)
        db_name = parsed.path.lstrip("/")

        if not db_name or db_name == "postgres":
            return True

        base_url = clean_url.rsplit("/", 1)[0] + "/postgres"

        async def _create_db():
            conn = await asyncpg.connect(base_url, timeout=3.0)
            try:
                exists = await conn.fetchval(
                    "SELECT 1 FROM pg_database WHERE datname = $1", db_name
                )
                if not exists:
                    await conn.execute(f'CREATE DATABASE "{db_name}"')
            finally:
                await conn.close()

        loop = asyncio.new_event_loop()
        coro = _create_db()
        try:
            loop.run_until_complete(coro)
            return True
        except Exception:
            try:
                coro.close()
            except Exception:
                pass
            return False
        finally:
            loop.close()
    except Exception:
        return False

def get_effective_db_url() -> str:
    db_url = settings.DATABASE_URL
    if db_url.startswith("postgresql"):
        if ensure_postgresql_database(db_url):
            return db_url
        return "sqlite+aiosqlite:///./ergon.db"
    return db_url

effective_url = get_effective_db_url()

engine_kwargs = {
    "echo": False,
    "future": True,
}

if effective_url.startswith("postgresql"):
    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "pool_size": 10,
        "max_overflow": 20,
    })

engine = create_async_engine(effective_url, **engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
