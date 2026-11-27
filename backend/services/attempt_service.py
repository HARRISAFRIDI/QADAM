"""Attempt lifecycle: create (practice / full mock / essay), load, autosave, check, submit.

Performance notes
- A whole paper is created with one random-selection query + one bulk insert.
- Loading an attempt is one join query; the answer key is never selected
  (except `is_checked` practice rows, resolved inside SQL with CASE).
- Autosave is a single UPDATE ... FROM unnest(...) that also enforces ownership,
  status and deadline, and ignores stale writes via `client_seq`.
- Submit locks the attempt row (FOR UPDATE), scores with one CTE, and inserts the
  result with ON CONFLICT DO NOTHING -> idempotent under concurrent requests.
"""

import random
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import case, func, insert, select, text, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from core.errors import AppError, bad_request, conflict, not_found
from models import (
    Attempt,
    AttemptQuestion,
    EssayTopic,
    MockTest,
    MockTestQuestion,
    Question,
    Result,
    User,
)
from schemas.attempt import CheckIn, FullMockIn, PracticeIn, SaveAnswersIn
from services.taxonomy import Taxonomy, get_taxonomy

PRACTICE_SECONDS_PER_QUESTION = 72  # 120 min / 100 MCQs
ESSAY_MAX = {"argument": 15, "narrative": 10}


def utcnow() -> datetime:
    return datetime.now(UTC)


def _grace() -> timedelta:
    return timedelta(seconds=get_settings().attempt_grace_seconds)


def is_expired(attempt: Attempt, now: datetime | None = None) -> bool:
    if attempt.deadline_at is None:
        return False
    return (now or utcnow()) > attempt.deadline_at + _grace()


# ---------------------------------------------------------------- creation


async def _pick_essay_options(db: AsyncSession, exam_id: int) -> dict | None:
    rows = (
        await db.execute(
            select(EssayTopic.id, EssayTopic.essay_type).where(
                EssayTopic.exam_id == exam_id, EssayTopic.status == "published"
            )
        )
    ).all()
    pools: dict[str, list[int]] = {"argument": [], "narrative": []}
    for topic_id, essay_type in rows:
        pools[essay_type].append(topic_id)
    if not pools["argument"] or not pools["narrative"]:
        return None
    return {k: random.sample(v, min(3, len(v))) for k, v in pools.items()}


async def _insert_questions(db: AsyncSession, attempt_id: uuid.UUID, rows: list[dict]) -> None:
    await db.execute(
        insert(AttemptQuestion),
        [
            {
                "attempt_id": attempt_id,
                "position": i,
                "question_id": r["question_id"],
                "section_id": r["section_id"],
                "subject_id": r["subject_id"],
            }
            for i, r in enumerate(rows, start=1)
        ],
    )


async def create_practice(db: AsyncSession, user: User, data: PracticeIn) -> Attempt:
    t = await get_taxonomy(db)
    cat = t.category(data.category)
    bp = t.blueprint(cat["id"])
    allowed = {r["subject_id"] for r in bp}

    # Topic-wise practice was removed: each topic has too few questions.
    topic_id = None
    section_id = subject_id = None
    if data.mode == "subject":
        if data.ref_id not in allowed:
            raise not_found("Subject")
        subject_id, subject_ids = data.ref_id, [data.ref_id]
        title = f"{t.subjects[data.ref_id]['name']} - Subject Practice"
    else:
        subject_ids = [r["subject_id"] for r in bp if r["section_id"] == data.ref_id]
        if not subject_ids:
            raise not_found("Section")
        section_id = data.ref_id
        title = f"{t.sections[data.ref_id]['name']} - Section Practice"

    stmt = select(Question.id, Question.subject_id).where(
        Question.exam_id == cat["exam_id"],
        Question.status == "published",
        Question.subject_id.in_(subject_ids),
    )
    picked = (await db.execute(stmt.order_by(func.random()).limit(data.count))).all()
    if not picked:
        raise bad_request(
            "No published questions are available for this selection yet.", "no_questions"
        )

    now = utcnow()
    attempt = Attempt(
        user_id=user.id,
        category_id=cat["id"],
        mode=data.mode,
        section_id=section_id,
        subject_id=subject_id,
        topic_id=topic_id,
        title=f"{cat['code']}: {title}",
        question_count=len(picked),
        started_at=now,
        deadline_at=(
            now + timedelta(seconds=PRACTICE_SECONDS_PER_QUESTION * len(picked))
            if data.timed
            else None
        ),
    )
    db.add(attempt)
    await db.flush()
    await _insert_questions(
        db,
        attempt.id,
        [
            {
                "question_id": qid,
                "subject_id": sid,
                "section_id": t.section_of_subject(cat["id"], sid),
            }
            for qid, sid in picked
        ],
    )
    await db.commit()
    return attempt


_FULL_MOCK_SQL = text(
    """
    SELECT s.id, s.subject_id FROM (
      SELECT q.id, q.subject_id,
             row_number() OVER (PARTITION BY q.subject_id ORDER BY random()) AS rn
      FROM questions q
      WHERE q.exam_id = :exam_id AND q.status = 'published'
        AND q.subject_id = ANY(CAST(:subject_ids AS int[]))
    ) s
    JOIN unnest(CAST(:subject_ids AS int[]), CAST(:quotas AS int[])) AS b(subject_id, quota)
      ON b.subject_id = s.subject_id
    WHERE s.rn <= b.quota
    """
)


async def _generated_paper(db: AsyncSession, t: Taxonomy, cat: dict) -> list[dict]:
    bp = t.blueprint(cat["id"])
    if not bp:
        return []
    rows = (
        await db.execute(
            _FULL_MOCK_SQL,
            {
                "exam_id": cat["exam_id"],
                "subject_ids": [r["subject_id"] for r in bp],
                "quotas": [r["mcq_count"] for r in bp],
            },
        )
    ).all()
    by_subject: dict[int, list[int]] = {}
    for qid, sid in rows:
        by_subject.setdefault(sid, []).append(qid)
    paper = []
    for r in bp:  # keep official section/subject order
        for qid in by_subject.get(r["subject_id"], []):
            paper.append(
                {"question_id": qid, "subject_id": r["subject_id"], "section_id": r["section_id"]}
            )
    return paper


async def create_full_mock(
    db: AsyncSession, user: User, data: FullMockIn
) -> tuple[Attempt, bool]:
    t = await get_taxonomy(db)
    cat = t.category(data.category)

    existing = (
        await db.execute(
            select(Attempt).where(
                Attempt.user_id == user.id,
                Attempt.category_id == cat["id"],
                Attempt.mode == "full_mock",
                Attempt.status == "in_progress",
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        if not is_expired(existing):
            return existing, True
        await submit(db, user.id, existing.id)

    duration = cat["mcq_duration_min"]
    title = f"{cat['code']}: Full Mock Test"
    mock_test_id = None
    if data.mock_test_id is not None:
        mock = (
            await db.execute(
                select(MockTest).where(
                    MockTest.id == data.mock_test_id,
                    MockTest.category_id == cat["id"],
                    MockTest.status == "published",
                )
            )
        ).scalar_one_or_none()
        if mock is None:
            raise not_found("Mock test")
        rows = (
            await db.execute(
                select(
                    MockTestQuestion.question_id,
                    MockTestQuestion.section_id,
                    Question.subject_id,
                )
                .join(Question, Question.id == MockTestQuestion.question_id)
                .where(MockTestQuestion.mock_test_id == mock.id, Question.status != "archived")
                .order_by(MockTestQuestion.position)
            )
        ).mappings()
        paper = [dict(r) for r in rows]
        duration, title, mock_test_id = mock.duration_min, f"{cat['code']}: {mock.title}", mock.id
    else:
        paper = await _generated_paper(db, t, cat)

    if not paper:
        raise bad_request(
            "No published questions are available for this category yet.", "no_questions"
        )

    essay_options = None
    if cat["essay_duration_min"]:
        essay_options = await _pick_essay_options(db, cat["exam_id"])

    now = utcnow()
    attempt = Attempt(
        user_id=user.id,
        category_id=cat["id"],
        mock_test_id=mock_test_id,
        mode="full_mock",
        title=title,
        question_count=len(paper),
        started_at=now,
        deadline_at=now + timedelta(minutes=duration),
        essay_status="pending" if essay_options else "none",
        essay_options=essay_options,
    )
    db.add(attempt)
    try:
        await db.flush()
    except IntegrityError:
        # Concurrent double start: the other request created it. Resume that one.
        await db.rollback()
        again = (
            await db.execute(
                select(Attempt).where(
                    Attempt.user_id == user.id,
                    Attempt.category_id == cat["id"],
                    Attempt.mode == "full_mock",
                    Attempt.status == "in_progress",
                )
            )
        ).scalar_one()
        return again, True
    await _insert_questions(db, attempt.id, paper)
    await db.commit()
    return attempt, False


async def create_essay_practice(db: AsyncSession, user: User, category: str) -> Attempt:
    t = await get_taxonomy(db)
    cat = t.category(category)
    if not cat["essay_duration_min"]:
        raise bad_request("This category has no essay section.")
    options = await _pick_essay_options(db, cat["exam_id"])
    if not options:
        raise bad_request("No essay topics are available yet.", "no_essay_topics")
    now = utcnow()
    attempt = Attempt(
        user_id=user.id,
        category_id=cat["id"],
        mode="essay",
        title=f"{cat['code']}: Essay Practice",
        status="submitted",
        question_count=0,
        started_at=now,
        submitted_at=now,
        essay_status="pending",
        essay_options=options,
    )
    db.add(attempt)
    await db.flush()
    db.add(
        Result(
            attempt_id=attempt.id,
            score=0,
            total_marks=0,
            correct=0,
            incorrect=0,
            unanswered=0,
            accuracy=0.0,
            time_used_sec=0,
            section_breakdown=[],
            subject_breakdown=[],
            essay_total=sum(ESSAY_MAX.values()),
        )
    )
    await db.commit()
    return attempt


# ---------------------------------------------------------------- loading


async def _own_attempt(
    db: AsyncSession, user_id: uuid.UUID, attempt_id: uuid.UUID, lock: bool = False
) -> Attempt:
    stmt = select(Attempt).where(Attempt.id == attempt_id, Attempt.user_id == user_id)
    if lock:
        stmt = stmt.with_for_update().execution_options(populate_existing=True)
    attempt = (await db.execute(stmt)).scalar_one_or_none()
    if attempt is None:
        raise not_found("Attempt")
    return attempt


async def get_attempt(db: AsyncSession, user_id: uuid.UUID, attempt_id: uuid.UUID) -> dict:
    attempt = await _own_attempt(db, user_id, attempt_id)
    if attempt.status == "in_progress" and is_expired(attempt):
        attempt = await submit(db, user_id, attempt_id)

    t = await get_taxonomy(db)
    cat = t.categories[attempt.category_id]
    aq, q = AttemptQuestion, Question
    rows = (
        await db.execute(
            select(
                aq.position,
                aq.section_id,
                aq.subject_id,
                aq.selected_option,
                aq.is_marked,
                aq.is_checked,
                aq.client_seq,
                q.stem,
                q.image_url,
                q.option_a,
                q.option_b,
                q.option_c,
                q.option_d,
                case((aq.is_checked, q.correct_option), else_=None).label("correct"),
                case((aq.is_checked, q.explanation), else_=None).label("explanation"),
            )
            .join(q, q.id == aq.question_id)
            .where(aq.attempt_id == attempt.id)
            .order_by(aq.position)
        )
    ).all()

    section_ids = sorted({r.section_id for r in rows}, key=lambda s: t.sections[s]["sort_order"])
    subject_ids = list(dict.fromkeys(r.subject_id for r in rows))
    return {
        "id": attempt.id,
        "title": attempt.title,
        "mode": attempt.mode,
        "status": attempt.status,
        "essay_status": attempt.essay_status,
        "category": {
            "code": cat["code"],
            "name": cat["name"],
            "exam": t.exams[cat["exam_id"]]["code"],
        },
        "started_at": attempt.started_at,
        "deadline_at": attempt.deadline_at,
        "server_now": utcnow(),
        "sections": [{"id": s, "name": t.sections[s]["name"]} for s in section_ids],
        "subjects": [{"id": s, "name": t.subjects[s]["name"]} for s in subject_ids],
        "questions": [
            {
                "position": r.position,
                "section_id": r.section_id,
                "subject_id": r.subject_id,
                "stem": r.stem,
                "image_url": r.image_url,
                "options": {"A": r.option_a, "B": r.option_b, "C": r.option_c, "D": r.option_d},
                "selected": r.selected_option,
                "marked": r.is_marked,
                "seq": r.client_seq,
                "checked": r.is_checked,
                "correct": r.correct,
                "explanation": r.explanation,
            }
            for r in rows
        ],
    }


# ---------------------------------------------------------------- autosave

_SAVE_SQL = text(
    """
    UPDATE attempt_questions AS aq
    SET selected_option = v.sel,
        is_marked = v.marked,
        client_seq = v.seq,
        answered_at = CASE WHEN v.sel IS NULL THEN NULL ELSE now() END
    FROM unnest(
        CAST(:pos AS smallint[]), CAST(:sel AS text[]),
        CAST(:marked AS boolean[]), CAST(:seq AS bigint[])
    ) AS v(pos, sel, marked, seq)
    WHERE aq.attempt_id = :aid
      AND aq.position = v.pos
      AND aq.client_seq < v.seq
      AND aq.is_checked = false
      AND EXISTS (
        SELECT 1 FROM attempts a
        WHERE a.id = :aid AND a.user_id = :uid AND a.status = 'in_progress'
          AND (a.deadline_at IS NULL OR a.deadline_at + make_interval(secs => :grace) > now())
      )
    """
)


async def save_answers(
    db: AsyncSession, user_id: uuid.UUID, attempt_id: uuid.UUID, data: SaveAnswersIn
) -> int:
    latest: dict[int, object] = {}
    for a in data.answers:  # dedupe: newest seq per position wins
        cur = latest.get(a.position)
        if cur is None or a.seq > cur.seq:  # type: ignore[attr-defined]
            latest[a.position] = a
    items = list(latest.values())
    result = await db.execute(
        _SAVE_SQL,
        {
            "aid": attempt_id,
            "uid": user_id,
            "grace": get_settings().attempt_grace_seconds,
            "pos": [a.position for a in items],  # type: ignore[attr-defined]
            "sel": [a.selected for a in items],  # type: ignore[attr-defined]
            "marked": [a.marked for a in items],  # type: ignore[attr-defined]
            "seq": [a.seq for a in items],  # type: ignore[attr-defined]
        },
    )
    await db.commit()
    saved = result.rowcount or 0
    if saved == 0:
        # Distinguish "stale/no-op" from "not allowed" (cheap PK lookup, rare path).
        attempt = await _own_attempt(db, user_id, attempt_id)
        if attempt.status != "in_progress":
            raise conflict("This attempt has already been submitted.", "attempt_submitted")
        if is_expired(attempt):
            raise conflict("Time is up for this attempt.", "attempt_expired")
    return saved


# ---------------------------------------------------------------- practice check


async def check_answer(
    db: AsyncSession, user_id: uuid.UUID, attempt_id: uuid.UUID, position: int, data: CheckIn
) -> dict:
    attempt = await _own_attempt(db, user_id, attempt_id)
    if attempt.mode not in ("topic", "subject", "section"):
        raise AppError(403, "forbidden", "Answers are revealed only after submitting a mock test.")
    if attempt.status != "in_progress":
        raise conflict("This attempt has already been submitted.", "attempt_submitted")
    if is_expired(attempt):
        raise conflict("Time is up for this attempt.", "attempt_expired")

    aq = AttemptQuestion
    row = (
        await db.execute(
            update(aq)
            .where(aq.attempt_id == attempt_id, aq.position == position, aq.is_checked.is_(False))
            .values(
                selected_option=data.selected,
                is_checked=True,
                client_seq=func.greatest(aq.client_seq, data.seq),
                answered_at=func.now(),
            )
            .returning(aq.question_id, aq.selected_option)
        )
    ).first()
    if row is None:
        row = (
            await db.execute(
                select(aq.question_id, aq.selected_option).where(
                    aq.attempt_id == attempt_id, aq.position == position
                )
            )
        ).first()
        if row is None:
            raise not_found("Question")
    q = (
        await db.execute(
            select(Question.correct_option, Question.explanation, Question.solution).where(
                Question.id == row.question_id
            )
        )
    ).one()
    await db.commit()
    return {
        "position": position,
        "selected": row.selected_option,
        "correct": q.correct_option,
        "is_correct": row.selected_option == q.correct_option,
        "explanation": q.explanation,
        "solution": q.solution,
    }


# ---------------------------------------------------------------- submit

_SCORE_SQL = text(
    """
    WITH upd AS (
      UPDATE attempt_questions aq
      SET is_correct = (aq.selected_option = q.correct_option)
      FROM questions q
      WHERE aq.attempt_id = :aid AND q.id = aq.question_id
      RETURNING aq.section_id, aq.subject_id, aq.selected_option, aq.is_correct, q.marks
    )
    SELECT section_id, subject_id,
           count(*) AS total,
           count(selected_option) AS attempted,
           count(*) FILTER (WHERE is_correct) AS correct,
           sum(marks) AS max_score,
           coalesce(sum(marks) FILTER (WHERE is_correct), 0) AS score
    FROM upd GROUP BY section_id, subject_id
    """
)


def _breakdown(rows: list, key: str, names: dict[int, dict]) -> list[dict]:
    agg: dict[int, dict] = {}
    for r in rows:
        k = getattr(r, key)
        e = agg.setdefault(
            k,
            {
                "id": k,
                "name": names[k]["name"],
                "total": 0,
                "attempted": 0,
                "correct": 0,
                "score": 0,
                "max_score": 0,
            },
        )
        e["total"] += r.total
        e["attempted"] += r.attempted
        e["correct"] += r.correct
        e["score"] += int(r.score)
        e["max_score"] += int(r.max_score)
    for e in agg.values():
        e["incorrect"] = e["attempted"] - e["correct"]
        e["unanswered"] = e["total"] - e["attempted"]
    return list(agg.values())


async def submit(db: AsyncSession, user_id: uuid.UUID, attempt_id: uuid.UUID) -> Attempt:
    attempt = await _own_attempt(db, user_id, attempt_id, lock=True)
    if attempt.status == "submitted":
        await db.commit()  # release lock
        return attempt  # idempotent

    t = await get_taxonomy(db)
    now = utcnow()
    submitted_at = min(now, attempt.deadline_at) if attempt.deadline_at else now
    rows = (await db.execute(_SCORE_SQL, {"aid": attempt.id})).all()

    total = sum(r.total for r in rows)
    attempted = sum(r.attempted for r in rows)
    correct = sum(r.correct for r in rows)
    essay_total = sum(ESSAY_MAX.values()) if attempt.essay_status != "none" else None
    await db.execute(
        pg_insert(Result)
        .values(
            attempt_id=attempt.id,
            score=sum(int(r.score) for r in rows),
            total_marks=sum(int(r.max_score) for r in rows),
            correct=correct,
            incorrect=attempted - correct,
            unanswered=total - attempted,
            accuracy=round(correct * 100.0 / attempted, 2) if attempted else 0.0,
            time_used_sec=max(0, int((submitted_at - attempt.started_at).total_seconds())),
            section_breakdown=_breakdown(rows, "section_id", t.sections),
            subject_breakdown=_breakdown(rows, "subject_id", t.subjects),
            essay_total=essay_total,
        )
        .on_conflict_do_nothing(index_elements=["attempt_id"])
    )
    attempt.status = "submitted"
    attempt.submitted_at = submitted_at
    await db.commit()
    return attempt
