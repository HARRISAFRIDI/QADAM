"""USAT essays: start (server-timed), autosave, submit, admin grading."""

import math
import random
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from core.errors import bad_request, conflict, not_found
from models import Attempt, EssaySubmission, EssayTopic, Result, User
from schemas.essay import EssaySaveIn
from services.attempt_service import ESSAY_MAX, _own_attempt
from services.taxonomy import get_taxonomy


def _now() -> datetime:
    return datetime.now(UTC)


def _expired(attempt: Attempt) -> bool:
    if attempt.essay_deadline_at is None:
        return False
    grace = timedelta(seconds=get_settings().attempt_grace_seconds)
    return _now() > attempt.essay_deadline_at + grace


def word_count(text: str) -> int:
    return len(text.split())


async def _finalize(db: AsyncSession, attempt: Attempt) -> None:
    await db.execute(
        update(EssaySubmission)
        .where(EssaySubmission.attempt_id == attempt.id, EssaySubmission.status == "draft")
        .values(status="submitted")
    )
    attempt.essay_status = "submitted"
    attempt.essay_submitted_at = min(_now(), attempt.essay_deadline_at or _now())


async def _state(db: AsyncSession, attempt: Attempt) -> dict:
    options = attempt.essay_options or {"argument": [], "narrative": []}
    ids = [i for v in options.values() for i in v]
    prompts = dict(
        (await db.execute(select(EssayTopic.id, EssayTopic.prompt).where(EssayTopic.id.in_(ids)))).all()
    )
    subs = (
        await db.execute(select(EssaySubmission).where(EssaySubmission.attempt_id == attempt.id))
    ).scalars()
    return {
        "attempt_id": attempt.id,
        "title": attempt.title,
        "mode": attempt.mode,
        "status": attempt.essay_status,
        "server_now": _now(),
        "deadline_at": attempt.essay_deadline_at,
        "options": {
            k: [{"id": i, "prompt": prompts[i]} for i in v if i in prompts] for k, v in options.items()
        },
        "essays": [
            {
                "essay_type": s.essay_type,
                "topic_id": s.essay_topic_id,
                "content": s.content,
                "word_count": s.word_count,
                "status": s.status,
                "max_score": s.max_score,
                "seq": s.client_seq,
            }
            for s in sorted(subs, key=lambda s: s.essay_type)
        ],
    }


async def start(db: AsyncSession, user_id: uuid.UUID, attempt_id: uuid.UUID) -> dict:
    """Idempotent: first call starts the essay clock, later calls return state."""
    attempt = await _own_attempt(db, user_id, attempt_id, lock=True)
    if attempt.essay_status == "none":
        raise bad_request("This attempt has no essay section.")
    if attempt.mode == "full_mock" and attempt.status != "submitted":
        raise conflict("Submit the MCQ section first.", "mcq_not_submitted")

    if attempt.essay_status == "pending":
        t = await get_taxonomy(db)
        minutes = t.categories[attempt.category_id]["essay_duration_min"] or 40
        now = _now()
        attempt.essay_status = "in_progress"
        attempt.essay_started_at = now
        attempt.essay_deadline_at = now + timedelta(minutes=minutes)
        await db.execute(
            pg_insert(EssaySubmission)
            .values(
                [
                    {"attempt_id": attempt.id, "essay_type": k, "max_score": v}
                    for k, v in ESSAY_MAX.items()
                ]
            )
            .on_conflict_do_nothing(index_elements=["attempt_id", "essay_type"])
        )
    elif attempt.essay_status == "in_progress" and _expired(attempt):
        await _finalize(db, attempt)
    await db.commit()
    return await _state(db, attempt)


async def save(
    db: AsyncSession, user_id: uuid.UUID, attempt_id: uuid.UUID, essay_type: str, data: EssaySaveIn
) -> int:
    attempt = await _own_attempt(db, user_id, attempt_id)
    if attempt.essay_status != "in_progress":
        raise conflict("Essays are not open for writing.", "essays_closed")
    if _expired(attempt):
        raise conflict("Time is up for the essay section.", "essays_expired")
    allowed = (attempt.essay_options or {}).get(essay_type, [])
    if data.topic_id is not None and data.topic_id not in allowed:
        raise bad_request("Please choose one of the given topics.")
    es = EssaySubmission
    result = await db.execute(
        update(es)
        .where(
            es.attempt_id == attempt.id,
            es.essay_type == essay_type,
            es.status == "draft",
            es.client_seq < data.seq,
        )
        .values(
            essay_topic_id=data.topic_id,
            content=data.content,
            word_count=word_count(data.content),
            client_seq=data.seq,
        )
    )
    await db.commit()
    return result.rowcount or 0


async def submit(db: AsyncSession, user_id: uuid.UUID, attempt_id: uuid.UUID) -> dict:
    attempt = await _own_attempt(db, user_id, attempt_id, lock=True)
    if attempt.essay_status in ("submitted", "graded"):
        await db.commit()
        return {"status": attempt.essay_status}
    if attempt.essay_status != "in_progress":
        raise conflict("Essays have not been started.", "essays_not_started")
    await _finalize(db, attempt)
    await db.commit()
    return {"status": attempt.essay_status}


SELF_SCORE_RANDOM_RANGE = (70, 90)


async def self_score(
    db: AsyncSession, user_id: uuid.UUID, attempt_id: uuid.UUID, percent: int | None
) -> dict:
    """The student wrote the essays on paper and gives themselves a score.

    `percent` is 75 / 85 (or any 1-100); None means a random percentage in
    SELF_SCORE_RANDOM_RANGE. Each essay gets that share of its own max marks,
    is marked graded, and never enters the admin grading queue.
    """
    attempt = await _own_attempt(db, user_id, attempt_id, lock=True)
    if attempt.essay_status == "none":
        raise bad_request("This attempt has no essay section.")
    if attempt.mode == "full_mock" and attempt.status != "submitted":
        raise conflict("Submit the MCQ section first.", "mcq_not_submitted")
    if attempt.essay_status in ("submitted", "graded"):
        raise conflict("Essays are already submitted.", "essays_closed")
    if percent is None:
        percent = random.randint(*SELF_SCORE_RANDOM_RANGE)

    now = _now()
    note = f"Self-assessed at {percent}% (written on paper)."
    # Round the overall total once, then split it, so 85% of 25 is 21 (not 22).
    total = math.floor(sum(ESSAY_MAX.values()) * percent / 100 + 0.5)
    left = total
    scores = {}
    items = list(ESSAY_MAX.items())
    for i, (essay_type, max_score) in enumerate(items):
        if i == len(items) - 1:
            scores[essay_type] = min(max_score, left)
        else:
            scores[essay_type] = min(max_score, math.floor(max_score * percent / 100 + 0.5))
            left -= scores[essay_type]
    for essay_type, max_score in items:
        score = scores[essay_type]
        await db.execute(
            pg_insert(EssaySubmission)
            .values(attempt_id=attempt.id, essay_type=essay_type, max_score=max_score)
            .on_conflict_do_nothing(index_elements=["attempt_id", "essay_type"])
        )
        await db.execute(
            update(EssaySubmission)
            .where(EssaySubmission.attempt_id == attempt.id, EssaySubmission.essay_type == essay_type)
            .values(status="graded", score=score, feedback=note, graded_at=now)
        )
    total = sum(scores.values())
    await db.execute(update(Result).where(Result.attempt_id == attempt.id).values(essay_score=total))
    attempt.essay_status = "graded"
    attempt.essay_started_at = attempt.essay_started_at or now
    attempt.essay_submitted_at = now
    await db.commit()
    return {"status": "graded", "percent": percent, "essay_score": total}


# ------------------------------------------------------------------ admin


async def grading_queue(db: AsyncSession, status: str, page: int, page_size: int) -> dict:
    t = await get_taxonomy(db)
    stmt = (
        select(
            Attempt.id,
            Attempt.title,
            Attempt.category_id,
            Attempt.essay_submitted_at,
            Attempt.essay_status,
            User.full_name,
            User.email,
            func.count().over().label("total"),
        )
        .join(User, User.id == Attempt.user_id)
        .where(Attempt.essay_status == status)
        .order_by(Attempt.essay_submitted_at.asc().nulls_last())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = (await db.execute(stmt)).all()
    return {
        "items": [
            {
                "attempt_id": r.id,
                "title": r.title,
                "category_code": t.categories[r.category_id]["code"],
                "submitted_at": r.essay_submitted_at,
                "essay_status": r.essay_status,
                "student_name": r.full_name,
                "student_email": r.email,
            }
            for r in rows
        ],
        "total": rows[0].total if rows else 0,
        "page": page,
        "page_size": page_size,
    }


async def attempt_essays_for_admin(db: AsyncSession, attempt_id: uuid.UUID) -> dict:
    attempt = await db.get(Attempt, attempt_id)
    if attempt is None:
        raise not_found("Attempt")
    student = await db.get(User, attempt.user_id)
    rows = (
        await db.execute(
            select(EssaySubmission, EssayTopic.prompt)
            .outerjoin(EssayTopic, EssayTopic.id == EssaySubmission.essay_topic_id)
            .where(EssaySubmission.attempt_id == attempt_id)
            .order_by(EssaySubmission.essay_type)
        )
    ).all()
    return {
        "attempt_id": attempt.id,
        "title": attempt.title,
        "essay_status": attempt.essay_status,
        "student_name": student.full_name if student else "",
        "essays": [
            {
                "id": s.id,
                "essay_type": s.essay_type,
                "topic": prompt,
                "content": s.content,
                "word_count": s.word_count,
                "status": s.status,
                "score": s.score,
                "max_score": s.max_score,
                "feedback": s.feedback,
            }
            for s, prompt in rows
        ],
    }


async def grade(
    db: AsyncSession, admin: User, submission_id: int, score: int, feedback: str | None
) -> None:
    sub = (
        await db.execute(
            select(EssaySubmission).where(EssaySubmission.id == submission_id).with_for_update()
        )
    ).scalar_one_or_none()
    if sub is None:
        raise not_found("Essay")
    if sub.status == "draft":
        raise conflict("This essay has not been submitted yet.")
    if not 0 <= score <= sub.max_score:
        raise bad_request(f"Score must be between 0 and {sub.max_score}.")
    sub.score, sub.feedback, sub.status = score, feedback, "graded"
    sub.graded_by, sub.graded_at = admin.id, _now()
    await db.flush()

    subs = (
        await db.execute(select(EssaySubmission).where(EssaySubmission.attempt_id == sub.attempt_id))
    ).scalars().all()
    if all(s.status == "graded" for s in subs):
        total = sum(s.score or 0 for s in subs)
        await db.execute(
            update(Result).where(Result.attempt_id == sub.attempt_id).values(essay_score=total)
        )
        await db.execute(
            update(Attempt).where(Attempt.id == sub.attempt_id).values(essay_status="graded")
        )
    await db.commit()
