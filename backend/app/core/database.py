"""Database engine, connection pooling, and session management supporting PostgreSQL & SQLite."""

import logging
from typing import AsyncGenerator
from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from backend.app.core.config import settings

logger = logging.getLogger(__name__)


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Enable Write-Ahead Logging (WAL) and performance optimizations on SQLite."""
    try:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()
    except Exception:
        pass


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
    """Create all registered relational tables and apply lightweight column migrations."""
    global engine, AsyncSessionLocal
    import backend.app.models  # register all models on Base.metadata

    def _apply_migrations(connection):
        try:
            from sqlalchemy import text
            res = connection.execute(text("PRAGMA table_info(inspections)"))
            cols = [r[1] for r in res.fetchall()]
            if cols and "sync_status" not in cols:
                connection.execute(text("ALTER TABLE inspections ADD COLUMN sync_status VARCHAR(20) DEFAULT 'pending' NOT NULL"))
        except Exception:
            pass

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            await conn.run_sync(_apply_migrations)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.warning(f"PostgreSQL connection failed during init_db: {e}. Switching to SQLite fallback...")
        engine = create_async_engine(settings.SQLITE_FALLBACK_URL, echo=False, connect_args={"check_same_thread": False})
        AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            await conn.run_sync(_apply_migrations)
        logger.info("SQLite fallback tables initialized successfully.")
