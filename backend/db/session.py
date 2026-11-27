"""Async engine + session factory, tuned for serverless + Supabase pooler."""

from collections.abc import AsyncIterator
from uuid import uuid4

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from core.config import get_settings, normalize_pg_url

_engine: AsyncEngine | None = None
_sessionmaker: async_sessionmaker[AsyncSession] | None = None


def build_engine(raw_url: str, pool_size: int, max_overflow: int = 5) -> AsyncEngine:
    url, connect_args, uses_pooler = normalize_pg_url(raw_url)
    connect_args = {**connect_args, "server_settings": {"application_name": "qadam-api"}}
    if uses_pooler:
        # Supavisor/PgBouncer transaction mode does not support prepared statements.
        connect_args["statement_cache_size"] = 0
        connect_args["prepared_statement_name_func"] = lambda: f"__asyncpg_{uuid4()}__"
        url += ("&" if "?" in url else "?") + "prepared_statement_cache_size=0"

    kwargs: dict = {"connect_args": connect_args}
    if pool_size <= 0:
        kwargs["poolclass"] = NullPool
    else:
        kwargs.update(
            pool_size=pool_size,
            max_overflow=max_overflow,
            pool_pre_ping=True,
            pool_recycle=300,
        )
    return create_async_engine(url, **kwargs)


def get_engine() -> AsyncEngine:
    global _engine, _sessionmaker
    if _engine is None:
        s = get_settings()
        _engine = build_engine(s.database_url, s.db_pool_size, s.db_max_overflow)
        _sessionmaker = async_sessionmaker(_engine, expire_on_commit=False, autoflush=False)
    return _engine


def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    get_engine()
    assert _sessionmaker is not None
    return _sessionmaker


async def get_db() -> AsyncIterator[AsyncSession]:
    async with get_sessionmaker()() as session:
        yield session


async def dispose_engine() -> None:
    global _engine, _sessionmaker
    if _engine is not None:
        await _engine.dispose()
    _engine = None
    _sessionmaker = None
