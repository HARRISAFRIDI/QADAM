"""Supabase Storage via REST (signed uploads straight from the browser).

Large files never pass through the Vercel function (4.5 MB body limit).
"""

import re
import uuid

import httpx

from core.config import get_settings
from core.errors import AppError, bad_request

ALLOWED_MIME = {
    "paper": {
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    "question_image": {"image/png", "image/jpeg", "image/webp", "image/avif"},
}
ALLOWED_MIME["answer_sheet"] = ALLOWED_MIME["paper"]
ALLOWED_MIME["solution"] = ALLOWED_MIME["paper"]
ALLOWED_EXT = {
    "paper": (".pdf", ".doc", ".docx"),
    "answer_sheet": (".pdf", ".doc", ".docx"),
    "solution": (".pdf", ".doc", ".docx"),
    "question_image": (".png", ".jpg", ".jpeg", ".webp", ".avif"),
}


def _require_enabled() -> None:
    if not get_settings().storage_enabled:
        raise AppError(
            503,
            "storage_not_configured",
            "File storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        )


def _headers() -> dict:
    key = get_settings().supabase_service_role_key or ""
    return {"Authorization": f"Bearer {key}", "apikey": key}


def _base() -> str:
    return (get_settings().supabase_url or "").rstrip("/") + "/storage/v1"


def bucket_for(kind: str) -> str:
    s = get_settings()
    return s.storage_public_bucket if kind == "question_image" else s.storage_private_bucket


def validate(kind: str, filename: str, mime: str, size: int) -> None:
    s = get_settings()
    if size > s.max_upload_mb * 1024 * 1024:
        raise bad_request(f"File is larger than {s.max_upload_mb} MB.")
    if not filename.lower().endswith(ALLOWED_EXT[kind]) or mime not in ALLOWED_MIME[kind]:
        allowed = ", ".join(ALLOWED_EXT[kind])
        raise bad_request(f"Unsupported file type. Allowed: {allowed}")


def build_path(kind: str, filename: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9._-]+", "-", filename).strip("-")[-80:] or "file"
    return f"{kind}/{uuid.uuid4().hex}/{safe}"


async def create_signed_upload(bucket: str, path: str) -> str:
    _require_enabled()
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(f"{_base()}/object/upload/sign/{bucket}/{path}", headers=_headers())
    if r.status_code >= 400:
        raise AppError(502, "storage_error", "Could not prepare the upload. Please retry.")
    url = r.json().get("url", "")
    return f"{_base()}{url}" if url.startswith("/") else url


async def create_signed_download(bucket: str, path: str, expires_in: int = 300) -> str:
    _require_enabled()
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            f"{_base()}/object/sign/{bucket}/{path}",
            headers=_headers(),
            json={"expiresIn": expires_in},
        )
    if r.status_code >= 400:
        raise AppError(502, "storage_error", "Could not create a download link.")
    signed = r.json().get("signedURL") or r.json().get("signedUrl") or ""
    return f"{_base()}{signed}" if signed.startswith("/") else signed


async def object_exists(bucket: str, path: str) -> bool:
    _require_enabled()
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.head(f"{_base()}/object/{bucket}/{path}", headers=_headers())
    return r.status_code == 200


def public_url(bucket: str, path: str) -> str:
    return f"{_base()}/object/public/{bucket}/{path}"
