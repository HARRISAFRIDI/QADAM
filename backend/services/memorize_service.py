"""Memorize: flashcard decks with spaced repetition (a simple SM-2 variant).

Grades: again / hard / good / easy.
- again: the card comes back in 10 minutes and counts as a lapse.
- hard / good / easy: the gap grows (1 day, then 3 days, then gap x ease).
A card with a gap of 21 days or more is "mastered".
"""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Literal

from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import not_found
from models import CardReview, User
from services.taxonomy import Taxonomy, get_taxonomy

Grade = Literal["again", "hard", "good", "easy"]
MASTERED_DAYS = 21
NEW_PER_SESSION = 10
AGAIN_DELAY = timedelta(minutes=10)


def utcnow() -> datetime:
    return datetime.now(UTC)


# ------------------------------------------------------------ scheduling


def schedule(ease: float, interval: int, reps: int, grade: Grade) -> tuple[float, int, int, bool]:
    """Return (ease, interval_days, reps, lapsed). interval 0 = again in 10 minutes."""
    if grade == "again":
        return max(1.3, ease - 0.2), 0, 0, True
    if grade == "hard":
        new = 1 if reps == 0 else max(interval + 1, round(interval * 1.2))
        return max(1.3, ease - 0.15), new, reps + 1, False
    if grade == "good":
        new = 1 if reps == 0 else 3 if reps == 1 else max(interval + 1, round(interval * ease))
        return ease, new, reps + 1, False
    new = 3 if reps == 0 else max(interval + 2, round(interval * ease * 1.3))
    return ease + 0.15, new, reps + 1, False


def _label(days: int) -> str:
    if days == 0:
        return "10m"
    if days < 30:
        return f"{days}d"
    if days < 365:
        return f"{round(days / 30)}mo"
    return f"{round(days / 365, 1)}y"


def preview(ease: float, interval: int, reps: int) -> dict[str, str]:
    return {g: _label(schedule(ease, interval, reps, g)[1]) for g in ("again", "hard", "good", "easy")}


def _status(reps: int | None, interval: int | None) -> str:
    if reps is None:
        return "new"
    return "mastered" if (interval or 0) >= MASTERED_DAYS else "learning"


# ------------------------------------------------------------ visibility


def _scope(t: Taxonomy, user: User) -> tuple[int | None, list[int]]:
    """(exam_id, subject_ids of the student's category). Empty list = no track."""
    cat = t.categories.get(user.preferred_category_id) if user.preferred_category_id else None
    if cat is None:
        return user.target_exam_id, []
    return cat["exam_id"], [r["subject_id"] for r in t.blueprint(cat["id"])]


_VISIBLE = """
  d.status = 'published'
  AND (d.exam_id IS NULL OR d.exam_id = :exam_id)
  AND (d.subject_id IS NULL OR cardinality(CAST(:sids AS int[])) = 0
       OR d.subject_id = ANY(CAST(:sids AS int[])))
"""


async def decks(db: AsyncSession, user: User) -> dict:
    t = await get_taxonomy(db)
    exam_id, sids = _scope(t, user)
    rows = (
        await db.execute(
            text(
                f"""
                SELECT d.id, d.kind, d.title, d.description, d.subject_id,
                       count(c.id) AS total,
                       count(c.id) FILTER (WHERE r.card_id IS NULL) AS new,
                       count(c.id) FILTER (WHERE r.due_at <= now()) AS due,
                       count(c.id) FILTER (WHERE r.interval_days >= {MASTERED_DAYS}) AS mastered
                FROM decks d
                JOIN cards c ON c.deck_id = d.id
                LEFT JOIN card_reviews r ON r.card_id = c.id AND r.user_id = :uid
                WHERE {_VISIBLE}
                GROUP BY d.id
                ORDER BY d.sort_order, d.id
                """
            ),
            {"uid": user.id, "exam_id": exam_id, "sids": sids},
        )
    ).mappings().all()
    items = [
        {
            **dict(r),
            "subject": t.subjects.get(r["subject_id"], {}).get("name") if r["subject_id"] else None,
        }
        for r in rows
    ]
    today = await reviewed_today(db, user.id)
    return {
        "decks": items,
        "totals": {
            "cards": sum(d["total"] for d in items),
            "due": sum(d["due"] for d in items),
            "new": sum(d["new"] for d in items),
            "mastered": sum(d["mastered"] for d in items),
            "reviewed_today": today,
        },
    }


async def reviewed_today(db: AsyncSession, user_id: uuid.UUID) -> int:
    return (
        await db.execute(
            text(
                "SELECT count(*) FROM card_reviews WHERE user_id = :uid AND "
                "(last_reviewed_at AT TIME ZONE 'Asia/Karachi')::date = "
                "(now() AT TIME ZONE 'Asia/Karachi')::date"
            ),
            {"uid": user_id},
        )
    ).scalar_one()


async def summary(db: AsyncSession, user: User) -> dict:
    """Small numbers for the dashboard."""
    t = await get_taxonomy(db)
    exam_id, sids = _scope(t, user)
    due, new = (
        await db.execute(
            text(
                f"""
                SELECT count(*) FILTER (WHERE r.due_at <= now()),
                       count(*) FILTER (WHERE r.card_id IS NULL)
                FROM decks d JOIN cards c ON c.deck_id = d.id
                LEFT JOIN card_reviews r ON r.card_id = c.id AND r.user_id = :uid
                WHERE {_VISIBLE}
                """
            ),
            {"uid": user.id, "exam_id": exam_id, "sids": sids},
        )
    ).one()
    return {"due": due, "new": new, "reviewed_today": await reviewed_today(db, user.id)}


async def deck_detail(db: AsyncSession, user: User, deck_id: int) -> dict:
    t = await get_taxonomy(db)
    exam_id, sids = _scope(t, user)
    deck = (
        await db.execute(
            text(f"SELECT d.* FROM decks d WHERE d.id = :id AND {_VISIBLE}"),
            {"id": deck_id, "exam_id": exam_id, "sids": sids},
        )
    ).mappings().first()
    if deck is None:
        raise not_found("Deck")
    cards = (
        await db.execute(
            text(
                """
                SELECT c.id, c.front, c.back, c.example, r.reps, r.interval_days, r.due_at
                FROM cards c LEFT JOIN card_reviews r ON r.card_id = c.id AND r.user_id = :uid
                WHERE c.deck_id = :id ORDER BY c.sort_order, c.id
                """
            ),
            {"id": deck_id, "uid": user.id},
        )
    ).mappings().all()
    return {
        "id": deck["id"],
        "kind": deck["kind"],
        "title": deck["title"],
        "description": deck["description"],
        "subject": t.subjects.get(deck["subject_id"], {}).get("name") if deck["subject_id"] else None,
        "cards": [
            {
                "id": c["id"],
                "front": c["front"],
                "back": c["back"],
                "example": c["example"],
                "status": _status(c["reps"], c["interval_days"]),
                "due_at": c["due_at"],
            }
            for c in cards
        ],
    }


async def queue(db: AsyncSession, user: User, deck_id: int | None, limit: int) -> dict:
    """Cards to review now: due cards first (oldest first), then up to 10 new ones."""
    t = await get_taxonomy(db)
    exam_id, sids = _scope(t, user)
    params = {"uid": user.id, "exam_id": exam_id, "sids": sids, "lim": limit, "deck": deck_id}
    deck_filter = " AND d.id = :deck" if deck_id is not None else ""
    base = f"""
        SELECT c.id, c.front, c.back, c.example, d.id AS deck_id, d.title AS deck, d.kind,
               r.ease, r.interval_days, r.reps, r.due_at
        FROM decks d JOIN cards c ON c.deck_id = d.id
        LEFT JOIN card_reviews r ON r.card_id = c.id AND r.user_id = :uid
        WHERE {_VISIBLE}{deck_filter}
    """
    due = (
        await db.execute(
            text(base + " AND r.due_at <= now() ORDER BY r.due_at LIMIT :lim"), params
        )
    ).mappings().all()
    room = min(NEW_PER_SESSION, limit - len(due))
    new = []
    if room > 0:
        new = (
            await db.execute(
                text(base + " AND r.card_id IS NULL ORDER BY d.sort_order, d.id, c.sort_order, c.id LIMIT :n"),
                {**params, "n": room},
            )
        ).mappings().all()
    items = []
    for r in [*due, *new]:
        ease, interval, reps = r["ease"] or 2.5, r["interval_days"] or 0, r["reps"] or 0
        items.append(
            {
                "id": r["id"],
                "front": r["front"],
                "back": r["back"],
                "example": r["example"],
                "deck_id": r["deck_id"],
                "deck": r["deck"],
                "kind": r["kind"],
                "status": _status(r["reps"], r["interval_days"]),
                "preview": preview(ease, interval, reps),
            }
        )
    return {"cards": items, "due": len(due), "new": len(new)}


async def review(db: AsyncSession, user: User, card_id: int, grade: Grade) -> dict:
    t = await get_taxonomy(db)
    exam_id, sids = _scope(t, user)
    row = (
        await db.execute(
            text(
                f"""
                SELECT c.id, r.ease, r.interval_days, r.reps, r.lapses
                FROM decks d JOIN cards c ON c.deck_id = d.id
                LEFT JOIN card_reviews r ON r.card_id = c.id AND r.user_id = :uid
                WHERE c.id = :cid AND {_VISIBLE}
                """
            ),
            {"uid": user.id, "cid": card_id, "exam_id": exam_id, "sids": sids},
        )
    ).mappings().first()
    if row is None:
        raise not_found("Card")
    ease, interval, reps, lapsed = schedule(
        row["ease"] or 2.5, row["interval_days"] or 0, row["reps"] or 0, grade
    )
    now = utcnow()
    due = now + (AGAIN_DELAY if interval == 0 else timedelta(days=interval))
    values = {
        "user_id": user.id,
        "card_id": card_id,
        "ease": ease,
        "interval_days": interval,
        "reps": reps,
        "lapses": (row["lapses"] or 0) + (1 if lapsed else 0),
        "due_at": due,
        "last_reviewed_at": now,
    }
    stmt = pg_insert(CardReview).values(**values)
    await db.execute(
        stmt.on_conflict_do_update(
            index_elements=["user_id", "card_id"],
            set_={k: stmt.excluded[k] for k in values if k not in ("user_id", "card_id")},
        )
    )
    await db.commit()
    return {"card_id": card_id, "interval_days": interval, "due_at": due, "status": _status(reps, interval)}
