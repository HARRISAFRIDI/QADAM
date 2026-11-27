"""Password hashing (bcrypt, off the event loop) and JWT session tokens."""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from anyio import to_thread

from core.config import get_settings

_ALGO = "HS256"
_BCRYPT_ROUNDS = 12


def _hash_sync(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(_BCRYPT_ROUNDS)).decode("ascii")


def _verify_sync(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("ascii"))
    except ValueError:
        return False


async def hash_password(password: str) -> str:
    return await to_thread.run_sync(_hash_sync, password)


async def verify_password(password: str, hashed: str) -> bool:
    return await to_thread.run_sync(_verify_sync, password, hashed)


_dummy_hash: str | None = None


async def dummy_verify(password: str) -> None:
    """Spend the same time as a real check when the email does not exist (no user enumeration)."""
    global _dummy_hash
    if _dummy_hash is None:
        _dummy_hash = await hash_password("qadam-dummy-password")
    await verify_password(password, _dummy_hash)


@dataclass(frozen=True, slots=True)
class TokenClaims:
    user_id: uuid.UUID
    role: str
    version: int


def create_access_token(user_id: uuid.UUID, role: str, version: int) -> str:
    s = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "role": role,
        "ver": version,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=s.access_token_ttl_minutes)).timestamp()),
    }
    return jwt.encode(payload, s.secret_key, algorithm=_ALGO)


def decode_access_token(token: str) -> TokenClaims | None:
    try:
        data = jwt.decode(token, get_settings().secret_key, algorithms=[_ALGO])
        return TokenClaims(uuid.UUID(data["sub"]), str(data["role"]), int(data.get("ver", 0)))
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
