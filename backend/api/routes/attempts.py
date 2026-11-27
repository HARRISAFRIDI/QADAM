import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Path, Response

from api.dependencies import DB, Claims, CurrentUser
from schemas.attempt import (
    AttemptCreated,
    AttemptOut,
    CheckIn,
    CheckOut,
    EssayPracticeIn,
    FullMockIn,
    PracticeIn,
    SaveAnswersIn,
    SaveAnswersOut,
    SubmitOut,
)
from services import attempt_service

router = APIRouter(tags=["attempts"])

NO_STORE = "private, no-store"


@router.post("/practice", response_model=AttemptCreated, status_code=201)
async def start_practice(data: PracticeIn, user: CurrentUser, db: DB):
    attempt = await attempt_service.create_practice(db, user, data)
    return {"id": attempt.id}


@router.post("/attempts", response_model=AttemptCreated, status_code=201)
async def start_full_mock(data: FullMockIn, user: CurrentUser, db: DB):
    attempt, resumed = await attempt_service.create_full_mock(db, user, data)
    return {"id": attempt.id, "resumed": resumed}


@router.post("/essay-practice", response_model=AttemptCreated, status_code=201)
async def start_essay_practice(data: EssayPracticeIn, user: CurrentUser, db: DB):
    attempt = await attempt_service.create_essay_practice(db, user, data.category)
    return {"id": attempt.id}


@router.get("/attempts/{attempt_id}", response_model=AttemptOut)
async def get_attempt(attempt_id: uuid.UUID, claims: Claims, db: DB, response: Response):
    response.headers["Cache-Control"] = NO_STORE
    return await attempt_service.get_attempt(db, claims.user_id, attempt_id)


@router.put("/attempts/{attempt_id}/answers", response_model=SaveAnswersOut)
async def save_answers(attempt_id: uuid.UUID, data: SaveAnswersIn, claims: Claims, db: DB):
    saved = await attempt_service.save_answers(db, claims.user_id, attempt_id, data)
    return {"saved": saved, "server_now": datetime.now(UTC)}


@router.post("/attempts/{attempt_id}/check/{position}", response_model=CheckOut)
async def check_answer(
    attempt_id: uuid.UUID,
    data: CheckIn,
    claims: Claims,
    db: DB,
    position: int = Path(ge=1, le=500),
):
    return await attempt_service.check_answer(db, claims.user_id, attempt_id, position, data)


@router.post("/attempts/{attempt_id}/submit", response_model=SubmitOut)
async def submit(attempt_id: uuid.UUID, claims: Claims, db: DB):
    attempt = await attempt_service.submit(db, claims.user_id, attempt_id)
    nxt = "essays" if attempt.essay_status in ("pending", "in_progress") else "results"
    return {"attempt_id": attempt.id, "next": nxt}
