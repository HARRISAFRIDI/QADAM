"""Create the Supabase Storage buckets (idempotent).

    python -m scripts.setup_storage

qadam-public  : question images (public read)
qadam-private : question papers, answer sheets, solutions (signed URLs only)
"""

import asyncio

import httpx

from core.config import get_settings


async def main() -> None:
    s = get_settings()
    if not s.storage_enabled:
        raise SystemExit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env first.")
    base = s.supabase_url.rstrip("/") + "/storage/v1"  # type: ignore[union-attr]
    headers = {"Authorization": f"Bearer {s.supabase_service_role_key}", "apikey": s.supabase_service_role_key or ""}
    buckets = [
        {"id": s.storage_public_bucket, "name": s.storage_public_bucket, "public": True,
         "file_size_limit": 5 * 1024 * 1024, "allowed_mime_types": ["image/png", "image/jpeg", "image/webp", "image/avif"]},
        {"id": s.storage_private_bucket, "name": s.storage_private_bucket, "public": False,
         "file_size_limit": s.max_upload_mb * 1024 * 1024,
         "allowed_mime_types": ["application/pdf", "application/msword",
                                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]},
    ]
    async with httpx.AsyncClient(timeout=20) as client:
        for b in buckets:
            r = await client.post(f"{base}/bucket", headers=headers, json=b)
            if r.status_code < 300:
                print(f"created bucket {b['id']}")
            elif "already exists" in r.text.lower() or r.status_code == 409:
                await client.put(f"{base}/bucket/{b['id']}", headers=headers, json=b)
                print(f"bucket {b['id']} exists (settings updated)")
            else:
                raise SystemExit(f"failed to create {b['id']}: {r.status_code} {r.text}")


if __name__ == "__main__":
    asyncio.run(main())
