"""Postgres-backed fixed-window rate limiter (shared across serverless instances)."""

from fastapi import Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppError

_SQL = text(
    """
    INSERT INTO rate_limits (key, window_start, count) VALUES (:key, now(), 1)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => :window)
                   THEN 1 ELSE rate_limits.count + 1 END,
      window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => :window)
                   THEN now() ELSE rate_limits.window_start END
    RETURNING count
    """
)


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    real = request.headers.get("x-real-ip")
    if real:
        return real.strip()
    return request.client.host if request.client else "unknown"


async def enforce(db: AsyncSession, key: str, limit: int, window_sec: int) -> None:
    count = (await db.execute(_SQL, {"key": key[:200], "window": window_sec})).scalar_one()
    await db.commit()
    if count > limit:
        raise AppError(429, "rate_limited", "Too many attempts. Please wait and try again.")
