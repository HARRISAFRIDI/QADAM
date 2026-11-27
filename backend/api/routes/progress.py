from typing import Literal

from fastapi import APIRouter, Query, Response

from api.dependencies import DB, CurrentUser
from services import dashboard_service, progress_service

router = APIRouter(tags=["progress"])
NO_STORE = "private, no-store"


@router.get("/me/overview")
async def my_overview(user: CurrentUser, db: DB, response: Response) -> dict:
    """Dashboard numbers for the student's selected test (409 `no_track` if none)."""
    response.headers["Cache-Control"] = NO_STORE
    return await dashboard_service.overview(db, user)


@router.get("/me/mistakes")
async def my_mistakes(
    user: CurrentUser,
    db: DB,
    response: Response,
    kind: Literal["wrong", "skipped", "flagged"] | None = None,
    subject_id: int | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
) -> dict:
    response.headers["Cache-Control"] = NO_STORE
    return await progress_service.mistakes(db, user, kind, subject_id, page, page_size)
