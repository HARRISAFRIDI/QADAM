from fastapi import APIRouter
from sqlalchemy import text

from api.dependencies import DB

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "qadam-api"}


@router.get("/health/db")
async def health_db(db: DB) -> dict:
    version = (await db.execute(text("SELECT version_num FROM alembic_version"))).scalar()
    return {"status": "ok", "database": "connected", "migration": version}
