"""Alembic env (async). Uses DATABASE_URL_MIGRATIONS (direct/session connection)
and falls back to DATABASE_URL. Never run migrations at API cold start."""

import asyncio

from alembic import context

import models  # noqa: F401  (register all tables)
from core.config import get_settings
from db.base import Base
from db.session import build_engine

target_metadata = Base.metadata


def _url() -> str:
    s = get_settings()
    return s.database_url_migrations or s.database_url


def run_migrations_offline() -> None:
    context.configure(url=_url(), target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def _do_run(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    engine = build_engine(_url(), pool_size=0)
    async with engine.connect() as connection:
        await connection.run_sync(_do_run)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
