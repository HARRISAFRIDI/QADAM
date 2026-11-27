"""Application settings loaded from environment variables (and `.env` locally)."""

from functools import lru_cache
from typing import Literal
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: Literal["development", "test", "preview", "production"] = "development"

    # --- database ---
    database_url: str
    database_url_migrations: str | None = None  # direct/session connection for Alembic
    db_pool_size: int = 5  # 0 => NullPool (one connection per request)
    db_max_overflow: int = 5

    # --- auth ---
    secret_key: str = Field(min_length=32)
    access_token_ttl_minutes: int = 60 * 24 * 7
    cookie_name: str = "qadam_session"
    cookie_secure: bool | None = None  # default: True outside development/test

    # --- http ---
    cors_allowed_origins: str = ""  # comma separated; empty when frontend proxies same-origin

    # --- storage (Supabase) ---
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    storage_public_bucket: str = "qadam-public"
    storage_private_bucket: str = "qadam-private"
    max_upload_mb: int = 25

    # --- exam engine ---
    attempt_grace_seconds: int = 30

    @field_validator("database_url", "database_url_migrations")
    @classmethod
    def _strip(cls, v: str | None) -> str | None:
        return v.strip() if isinstance(v, str) else v

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def secure_cookies(self) -> bool:
        if self.cookie_secure is not None:
            return self.cookie_secure
        return self.environment not in ("development", "test")

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]

    @property
    def storage_enabled(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)


def normalize_pg_url(raw: str) -> tuple[str, dict, bool]:
    """Convert any postgres URL into an asyncpg SQLAlchemy URL.

    Returns (url, connect_args, uses_transaction_pooler).
    - `postgres://` / `postgresql://` -> `postgresql+asyncpg://`
    - `sslmode=` (libpq style, unsupported by asyncpg) -> `ssl` connect arg
    - Supabase transaction pooler (port 6543 / pgbouncer=true) is detected so that
      prepared statements can be disabled.
    """
    parts = urlsplit(raw)
    scheme = "postgresql+asyncpg"
    query = dict(parse_qsl(parts.query))
    connect_args: dict = {}

    sslmode = query.pop("sslmode", None)
    pgbouncer = query.pop("pgbouncer", None)
    query.pop("supa", None)
    host = parts.hostname or ""
    if sslmode in ("require", "verify-ca", "verify-full") or host.endswith(
        (".supabase.com", ".supabase.co")
    ):
        connect_args["ssl"] = "require"
    elif sslmode == "disable":
        connect_args["ssl"] = False

    uses_pooler = parts.port == 6543 or pgbouncer == "true"
    url = urlunsplit((scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))
    return url, connect_args, uses_pooler


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
