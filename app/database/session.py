import asyncio
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.core.config import settings

def test_postgresql_connection(url: str) -> bool:
    if not url.startswith("postgresql"):
        return False
    try:
        import asyncpg
        clean_url = url.replace("postgresql+asyncpg://", "postgresql://")
        
        async def _test():
            conn = await asyncpg.connect(clean_url, timeout=2.0)
            await conn.close()

        loop = asyncio.new_event_loop()
        try:
            loop.run_until_complete(_test())
            return True
        except Exception:
            return False
        finally:
            loop.close()
    except Exception:
        return False

def get_effective_db_url() -> str:
    db_url = settings.DATABASE_URL
    if db_url.startswith("postgresql"):
        if test_postgresql_connection(db_url):
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
