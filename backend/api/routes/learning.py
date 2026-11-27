from fastapi import APIRouter, Depends, Query, Response

from api.dependencies import DB, AdminUser, CurrentUser, require_admin
from schemas.common import OkResponse
from schemas.memorize import CardIn, CardPatch, DeckIn, DeckPatch, PlanIn, ReviewIn, TaskDoneIn
from services import deck_admin_service, memorize_service, plan_service

router = APIRouter(tags=["learning"])
NO_STORE = "private, no-store"


# ---------------------------------------------------------------- memorize


@router.get("/memorize/decks")
async def memorize_decks(user: CurrentUser, db: DB, response: Response) -> dict:
    response.headers["Cache-Control"] = NO_STORE
    return await memorize_service.decks(db, user)


@router.get("/memorize/decks/{deck_id}")
async def memorize_deck(deck_id: int, user: CurrentUser, db: DB, response: Response) -> dict:
    response.headers["Cache-Control"] = NO_STORE
    return await memorize_service.deck_detail(db, user, deck_id)


@router.get("/memorize/queue")
async def memorize_queue(
    user: CurrentUser,
    db: DB,
    response: Response,
    deck_id: int | None = None,
    limit: int = Query(20, ge=1, le=100),
) -> dict:
    response.headers["Cache-Control"] = NO_STORE
    return await memorize_service.queue(db, user, deck_id, limit)


@router.post("/memorize/cards/{card_id}/review")
async def memorize_review(card_id: int, data: ReviewIn, user: CurrentUser, db: DB) -> dict:
    return await memorize_service.review(db, user, card_id, data.grade)


# ---------------------------------------------------------------- study plans


@router.get("/study-plans/current")
async def plan_current(user: CurrentUser, db: DB, response: Response) -> dict:
    response.headers["Cache-Control"] = NO_STORE
    return await plan_service.current(db, user)


@router.post("/study-plans", status_code=201)
async def plan_create(data: PlanIn, user: CurrentUser, db: DB) -> dict:
    return await plan_service.create(db, user, data)


@router.delete("/study-plans/current", response_model=OkResponse)
async def plan_archive(user: CurrentUser, db: DB):
    await plan_service.archive(db, user)
    return OkResponse()


@router.post("/study-plans/tasks/{task_id}/start")
async def plan_task_start(task_id: int, user: CurrentUser, db: DB) -> dict:
    return await plan_service.start(db, user, task_id)


@router.put("/study-plans/tasks/{task_id}/done")
async def plan_task_done(task_id: int, data: TaskDoneIn, user: CurrentUser, db: DB) -> dict:
    return await plan_service.set_done(db, user, task_id, data.done)


# ---------------------------------------------------------------- admin: decks

admin = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@admin.get("/decks")
async def admin_decks(db: DB) -> list[dict]:
    return await deck_admin_service.list_decks(db)


@admin.post("/decks", status_code=201)
async def admin_deck_create(data: DeckIn, user: AdminUser, db: DB) -> dict:
    return await deck_admin_service.create_deck(db, user, data)


@admin.get("/decks/{deck_id}")
async def admin_deck(deck_id: int, db: DB) -> dict:
    return await deck_admin_service.get_deck(db, deck_id)


@admin.patch("/decks/{deck_id}")
async def admin_deck_patch(deck_id: int, data: DeckPatch, user: AdminUser, db: DB) -> dict:
    return await deck_admin_service.patch_deck(db, user, deck_id, data)


@admin.delete("/decks/{deck_id}", response_model=OkResponse)
async def admin_deck_delete(deck_id: int, user: AdminUser, db: DB):
    await deck_admin_service.delete_deck(db, user, deck_id)
    return OkResponse()


@admin.post("/decks/{deck_id}/cards")
async def admin_cards_add(deck_id: int, data: CardIn, user: AdminUser, db: DB) -> dict:
    return await deck_admin_service.add_cards(db, user, deck_id, data)


@admin.patch("/cards/{card_id}")
async def admin_card_patch(card_id: int, data: CardPatch, user: AdminUser, db: DB) -> dict:
    return await deck_admin_service.patch_card(db, user, card_id, data)


@admin.delete("/cards/{card_id}", response_model=OkResponse)
async def admin_card_delete(card_id: int, user: AdminUser, db: DB):
    await deck_admin_service.delete_card(db, user, card_id)
    return OkResponse()
