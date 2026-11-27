import uuid
from typing import Literal

from fastapi import APIRouter, Query, Response

from api.dependencies import DB, Claims, CurrentUser
from schemas.common import OkResponse, Page
from schemas.essay import EssaySaveIn, EssaysOut
from schemas.result import HistoryItem, ResultOut, ReviewOut
from services import essay_service, result_service

router = APIRouter(tags=["results"])
NO_STORE = "private, no-store"


@router.get("/results/{attempt_id}", response_model=ResultOut)
async def get_result(attempt_id: uuid.UUID, user: CurrentUser, db: DB, response: Response):
    response.headers["Cache-Control"] = NO_STORE
    return await result_service.get_result(db, user, attempt_id)


@router.get("/results/{attempt_id}/review", response_model=ReviewOut)
async def get_review(attempt_id: uuid.UUID, user: CurrentUser, db: DB, response: Response):
    response.headers["Cache-Control"] = NO_STORE
    return await result_service.get_review(db, user, attempt_id)


@router.get("/me/history", response_model=Page[HistoryItem])
async def my_history(
    claims: Claims,
    db: DB,
    response: Response,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    response.headers["Cache-Control"] = NO_STORE
    return await result_service.history(db, claims.user_id, page, page_size)


# ---- essays ----


@router.post("/attempts/{attempt_id}/essays/start", response_model=EssaysOut)
async def start_essays(attempt_id: uuid.UUID, claims: Claims, db: DB):
    return await essay_service.start(db, claims.user_id, attempt_id)


@router.put("/attempts/{attempt_id}/essays/{essay_type}", response_model=OkResponse)
async def save_essay(
    attempt_id: uuid.UUID,
    essay_type: Literal["argument", "narrative"],
    data: EssaySaveIn,
    claims: Claims,
    db: DB,
):
    await essay_service.save(db, claims.user_id, attempt_id, essay_type, data)
    return OkResponse()


@router.post("/attempts/{attempt_id}/essays/submit")
async def submit_essays(attempt_id: uuid.UUID, claims: Claims, db: DB) -> dict:
    return await essay_service.submit(db, claims.user_id, attempt_id)
