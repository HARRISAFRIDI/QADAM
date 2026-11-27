"""Public, cacheable catalog endpoints (no student data)."""

from fastapi import APIRouter, Response

from api.dependencies import DB
from schemas.catalog import CategoryOverview, ExamOut
from services import catalog_service

router = APIRouter(tags=["catalog"])

PUBLIC_CACHE = "public, max-age=60, s-maxage=60, stale-while-revalidate=300"


@router.get("/exams", response_model=list[ExamOut])
async def list_exams(db: DB, response: Response):
    response.headers["Cache-Control"] = PUBLIC_CACHE
    return await catalog_service.list_exams(db)


@router.get("/categories/{code}/overview", response_model=CategoryOverview)
async def category_overview(code: str, db: DB, response: Response):
    response.headers["Cache-Control"] = PUBLIC_CACHE
    return await catalog_service.category_overview(db, code)
