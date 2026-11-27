"""Admin editor for flashcard decks and cards."""

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import bad_request, not_found
from models import Card, Deck, User
from schemas.memorize import CardIn, CardPatch, DeckIn, DeckPatch
from services.audit import audit
from services.taxonomy import get_taxonomy


def parse_lines(raw: str) -> list[dict]:
    """One card per line: `front | back | example` (example optional)."""
    cards, errors = [], []
    for n, line in enumerate(raw.splitlines(), start=1):
        line = line.strip()
        if not line:
            continue
        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 2 or not parts[0] or not parts[1]:
            errors.append(n)
            continue
        cards.append({"front": parts[0], "back": parts[1], "example": " | ".join(parts[2:]) or None})
    if errors:
        shown = ", ".join(map(str, errors[:8]))
        raise bad_request(f"Lines {shown} need 'front | back'.", "bad_lines")
    if not cards:
        raise bad_request("Add at least one card.", "no_cards")
    return cards


async def _resolve(db: AsyncSession, exam: str | None, subject_id: int | None) -> tuple[int | None, int | None]:
    t = await get_taxonomy(db)
    exam_id = None
    if exam:
        e = t.exam_by_code.get(exam)
        if e is None:
            raise not_found("Exam")
        exam_id = e["id"]
    if subject_id is not None and subject_id not in t.subjects:
        raise not_found("Subject")
    return exam_id, subject_id


async def _deck_out(db: AsyncSession, deck: Deck) -> dict:
    t = await get_taxonomy(db)
    count = await db.scalar(select(func.count()).select_from(Card).where(Card.deck_id == deck.id))
    return {
        "id": deck.id,
        "kind": deck.kind,
        "title": deck.title,
        "description": deck.description,
        "status": deck.status,
        "sort_order": deck.sort_order,
        "exam": t.exams[deck.exam_id]["code"] if deck.exam_id in t.exams else None,
        "subject_id": deck.subject_id,
        "subject": t.subjects.get(deck.subject_id, {}).get("name") if deck.subject_id else None,
        "card_count": count or 0,
        "updated_at": deck.updated_at,
    }


async def list_decks(db: AsyncSession) -> list[dict]:
    t = await get_taxonomy(db)
    rows = (
        await db.execute(
            select(Deck, func.count(Card.id))
            .outerjoin(Card, Card.deck_id == Deck.id)
            .group_by(Deck.id)
            .order_by(Deck.sort_order, Deck.id)
        )
    ).all()
    return [
        {
            "id": d.id,
            "kind": d.kind,
            "title": d.title,
            "status": d.status,
            "exam": t.exams[d.exam_id]["code"] if d.exam_id in t.exams else None,
            "subject": t.subjects.get(d.subject_id, {}).get("name") if d.subject_id else None,
            "card_count": n,
            "updated_at": d.updated_at,
        }
        for d, n in rows
    ]


async def _get(db: AsyncSession, deck_id: int) -> Deck:
    deck = await db.get(Deck, deck_id)
    if deck is None:
        raise not_found("Deck")
    return deck


async def get_deck(db: AsyncSession, deck_id: int) -> dict:
    deck = await _get(db, deck_id)
    cards = (
        await db.execute(select(Card).where(Card.deck_id == deck_id).order_by(Card.sort_order, Card.id))
    ).scalars()
    return {
        **(await _deck_out(db, deck)),
        "cards": [
            {"id": c.id, "front": c.front, "back": c.back, "example": c.example} for c in cards
        ],
    }


async def create_deck(db: AsyncSession, admin: User, data: DeckIn) -> dict:
    exam_id, subject_id = await _resolve(db, data.exam, data.subject_id)
    deck = Deck(
        kind=data.kind,
        title=data.title.strip(),
        description=(data.description or "").strip() or None,
        exam_id=exam_id,
        subject_id=subject_id,
        status=data.status,
        sort_order=data.sort_order,
        created_by=admin.id,
    )
    db.add(deck)
    await db.flush()
    if data.cards:
        await _add_cards(db, deck.id, parse_lines(data.cards))
    audit(db, admin, "deck.create", "deck", deck.id, {"title": deck.title})
    await db.commit()
    await db.refresh(deck)
    return await _deck_out(db, deck)


async def patch_deck(db: AsyncSession, admin: User, deck_id: int, data: DeckPatch) -> dict:
    deck = await _get(db, deck_id)
    changes = data.model_dump(exclude_unset=True)
    if "exam" in changes or "subject_id" in changes:
        exam_id, subject_id = await _resolve(
            db,
            changes.get("exam", None) if "exam" in changes else None,
            changes.get("subject_id") if "subject_id" in changes else deck.subject_id,
        )
        if "exam" in changes:
            deck.exam_id = exam_id
        if "subject_id" in changes:
            deck.subject_id = subject_id
    for k in ("kind", "title", "description", "status", "sort_order"):
        if k in changes:
            setattr(deck, k, changes[k])
    if deck.status == "published":
        n = await db.scalar(select(func.count()).select_from(Card).where(Card.deck_id == deck.id))
        if not n:
            raise bad_request("Add cards before publishing this deck.", "empty_deck")
    audit(db, admin, "deck.update", "deck", deck.id, {k: str(v) for k, v in changes.items()})
    await db.commit()
    await db.refresh(deck)
    return await _deck_out(db, deck)


async def delete_deck(db: AsyncSession, admin: User, deck_id: int) -> None:
    deck = await _get(db, deck_id)
    audit(db, admin, "deck.delete", "deck", deck.id, {"title": deck.title})
    await db.delete(deck)
    await db.commit()


async def _add_cards(db: AsyncSession, deck_id: int, cards: list[dict]) -> int:
    start = (
        await db.scalar(select(func.coalesce(func.max(Card.sort_order), 0)).where(Card.deck_id == deck_id))
    ) or 0
    for i, c in enumerate(cards, start=1):
        db.add(Card(deck_id=deck_id, sort_order=start + i, **c))
    return len(cards)


async def add_cards(db: AsyncSession, admin: User, deck_id: int, data: CardIn) -> dict:
    await _get(db, deck_id)
    n = await _add_cards(db, deck_id, parse_lines(data.lines))
    audit(db, admin, "deck.cards_add", "deck", deck_id, {"count": n})
    await db.commit()
    return {"added": n}


async def patch_card(db: AsyncSession, admin: User, card_id: int, data: CardPatch) -> dict:
    card = await db.get(Card, card_id)
    if card is None:
        raise not_found("Card")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(card, k, (v.strip() or None) if k == "example" and v is not None else v)
    await db.commit()
    return {"id": card.id, "front": card.front, "back": card.back, "example": card.example}


async def delete_card(db: AsyncSession, admin: User, card_id: int) -> None:
    card = await db.get(Card, card_id)
    if card is None:
        raise not_found("Card")
    deck = await _get(db, card.deck_id)
    await db.execute(delete(Card).where(Card.id == card_id))
    left = await db.scalar(select(func.count()).select_from(Card).where(Card.deck_id == deck.id))
    if not left and deck.status == "published":
        deck.status = "draft"  # an empty deck can't stay published
    audit(db, admin, "deck.card_delete", "deck", deck.id, {"card_id": card_id})
    await db.commit()
