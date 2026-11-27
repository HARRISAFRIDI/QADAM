"""Shared FastAPI dependencies: DB session, authentication, authorization."""

from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from core.errors import AppError, forbidden
from core.security import TokenClaims, decode_access_token
from db.session import get_db
from models import User

DB = Annotated[AsyncSession, Depends(get_db)]


def _extract_token(request: Request) -> str | None:
    auth = request.headers.get("authorization")
    if auth and auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return request.cookies.get(get_settings().cookie_name)


def get_claims(request: Request) -> TokenClaims:
    """Stateless check (no DB hit). Used on hot paths such as autosave,
    where the SQL itself also enforces ownership."""
    token = _extract_token(request)
    claims = decode_access_token(token) if token else None
    if claims is None:
        raise AppError(401, "unauthorized", "Please log in to continue")
    return claims


Claims = Annotated[TokenClaims, Depends(get_claims)]


async def get_current_user(claims: Claims, db: DB) -> User:
    user = (await db.execute(select(User).where(User.id == claims.user_id))).scalar_one_or_none()
    if user is None or not user.is_active or user.token_version != claims.version:
        raise AppError(401, "unauthorized", "Your session has expired. Please log in again.")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def require_admin(user: CurrentUser) -> User:
    if user.role != "admin":
        raise forbidden()
    return user


AdminUser = Annotated[User, Depends(require_admin)]
