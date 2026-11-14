"""Database engine, connection pooling, and session management supporting PostgreSQL & SQLite."""

import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from backend.app.core.config import settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


# Primary PostgreSQL engine
def build_engine():
    db_url = settings.DATABASE_URL
    # Connect arguments based on dialect
    connect_args = {}
    if db_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False

    try:
        return create_async_engine(db_url, echo=False, connect_args=connect_args)
    except Exception as e:
        logger.warning(f"Could not connect to {db_url}: {e}. Falling back to SQLite.")
        return create_async_engine(settings.SQLITE_FALLBACK_URL, echo=False, connect_args={"check_same_thread": False})


engine = build_engine()
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency providing an async database session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """Create all registered relational tables."""
    global engine, AsyncSessionLocal
    import backend.app.models  # register all models on Base.metadata
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.warning(f"PostgreSQL connection failed during init_db: {e}. Switching to SQLite fallback...")
        engine = create_async_engine(settings.SQLITE_FALLBACK_URL, echo=False, connect_args={"check_same_thread": False})
        AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("SQLite fallback tables initialized successfully.")
