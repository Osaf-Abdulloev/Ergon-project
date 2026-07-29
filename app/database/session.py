from typing import AsyncGenerator
import socket
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.core.config import settings

def get_effective_db_url() -> str:
    db_url = settings.DATABASE_URL
    if db_url.startswith("postgresql"):
        try:
            with socket.create_connection(("localhost", 5432), timeout=1.0):
                return db_url
        except Exception:
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
