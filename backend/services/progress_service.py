"""Student analytics: dashboard overview, Mistake Notebook, recommendations.

Everything is computed from attempts / attempt_questions; there are no extra
tables to keep in sync.

Mistake Notebook rule: for each question, look at the student's *latest* answer
(from a submitted attempt, or a practice answer that was checked). The question
is in the notebook while that latest answer is wrong, skipped, or flagged.
Answering it correctly (and not flagging it) in a later session removes it.

Days are counted in Pakistan time (UTC+5, no daylight saving).
"""

import uuid
from datetime import UTC, date, datetime, time, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppError
from models import User
from services.taxonomy import Taxonomy, get_taxonomy

PKT = timezone(timedelta(hours=5))
WEAK_MIN_ANSWERED = 5
WEAK_BELOW = 70.0

# ------------------------------------------------------------ mistakes

_LATEST_CTE = """
WITH latest AS (
  SELECT DISTINCT ON (aq.question_id)
         aq.question_id, aq.subject_id, aq.selected_option, aq.is_marked,
         a.started_at AS seen_at
  FROM attempt_questions aq
  JOIN attempts a ON a.id = aq.attempt_id
  WHERE a.user_id = :uid AND a.mode <> 'essay'
    AND (a.status = 'submitted' OR aq.is_checked)
    AND aq.subject_id = ANY(CAST(:sids AS int[]))
  ORDER BY aq.question_id, a.started_at DESC, aq.answered_at DESC NULLS LAST
), m AS (
  SELECT l.question_id, l.subject_id, l.selected_option, l.is_marked, l.seen_at,
         q.correct_option, q.difficulty,
         CASE WHEN l.selected_option IS NULL THEN 'skipped'
              WHEN l.selected_option <> q.correct_option THEN 'wrong'
              ELSE 'flagged' END AS kind
  FROM latest l
  JOIN questions q ON q.id = l.question_id
  WHERE q.exam_id = :exam_id AND q.status = 'published'
    AND (l.is_marked OR l.selected_option IS NULL OR l.selected_option <> q.correct_option)
)
"""

KINDS = ("wrong", "skipped", "flagged")


def _track(t: Taxonomy, user: User) -> dict:
    cat = t.categories.get(user.preferred_category_id) if user.preferred_category_id else None
    if cat is None:
        raise AppError(409, "no_track", "Choose your test first.")
    return cat


def _kind_filter(kind: str | None) -> str:
    if kind == "flagged":
        return " AND m.is_marked"
    if kind in ("wrong", "skipped"):
        return f" AND m.kind = '{kind}'"
    return ""


async def mistake_question_ids(
    db: AsyncSession,
    user_id: uuid.UUID,
    exam_id: int,
    subject_ids: list[int],
    difficulty: str | None,
    limit: int,
) -> list[tuple[int, int]]:
    """Random (question_id, subject_id) pairs from the notebook, for a revision session."""
    sql = _LATEST_CTE + "SELECT m.question_id, m.subject_id FROM m WHERE true"
    params: dict = {"uid": user_id, "exam_id": exam_id, "sids": subject_ids, "lim": limit}
    if difficulty:
        sql += " AND m.difficulty = :diff"
        params["diff"] = difficulty
    sql += " ORDER BY random() LIMIT :lim"
    return [(r[0], r[1]) for r in (await db.execute(text(sql), params)).all()]


async def mistakes(
    db: AsyncSession,
    user: User,
    kind: str | None,
    subject_id: int | None,
    page: int,
    page_size: int,
) -> dict:
    t = await get_taxonomy(db)
    cat = _track(t, user)
    sids = [r["subject_id"] for r in t.blueprint(cat["id"])]
    params: dict = {"uid": user.id, "exam_id": cat["exam_id"], "sids": sids}

    summary = (
        await db.execute(
            text(
                _LATEST_CTE + "SELECT m.subject_id, m.kind, count(*), "
                "count(*) FILTER (WHERE m.is_marked) FROM m GROUP BY m.subject_id, m.kind"
            ),
            params,
        )
    ).all()
    # "flagged" counts every flagged question, including flagged wrong/skipped ones.
    counts = {"all": 0, "wrong": 0, "skipped": 0, "flagged": 0}
    by_subject: dict[int, int] = {}
    for sid, k, n, flagged in summary:
        counts["all"] += n
        if k in ("wrong", "skipped"):
            counts[k] += n
        counts["flagged"] += flagged
        by_subject[sid] = by_subject.get(sid, 0) + n

    where = _kind_filter(kind)
    if subject_id is not None:
        where += " AND m.subject_id = :sub"
        params["sub"] = subject_id
    params.update(lim=page_size, off=(page - 1) * page_size)
    rows = (
        (
            await db.execute(
                text(
                    _LATEST_CTE
                    + "SELECT m.*, q.stem, q.image_url, q.option_a, q.option_b, q.option_c, "
                    "q.option_d, q.explanation, q.solution, count(*) OVER () AS total "
                    "FROM m JOIN questions q ON q.id = m.question_id WHERE true"
                    + where
                    + " ORDER BY m.seen_at DESC, m.question_id LIMIT :lim OFFSET :off"
                ),
                params,
            )
        )
        .mappings()
        .all()
    )

    return {
        "counts": counts,
        "subjects": [
            {"id": sid, "name": t.subjects[sid]["name"], "count": by_subject.get(sid, 0)}
            for sid in sids
            if sid in t.subjects
        ],
        "items": [
            {
                "question_id": r["question_id"],
                "subject": t.subjects.get(r["subject_id"], {}).get("name", ""),
                "subject_id": r["subject_id"],
                "kind": r["kind"],
                "flagged": r["is_marked"],
                "difficulty": r["difficulty"],
                "seen_at": r["seen_at"],
                "stem": r["stem"],
                "image_url": r["image_url"],
                "options": {
                    "A": r["option_a"],
                    "B": r["option_b"],
                    "C": r["option_c"],
                    "D": r["option_d"],
                },
                "selected": r["selected_option"],
                "correct": r["correct_option"],
                "explanation": r["explanation"],
                "solution": r["solution"],
            }
            for r in rows
        ],
        "total": rows[0]["total"] if rows else 0,
        "page": page,
        "page_size": page_size,
    }


# ------------------------------------------------------------ overview

_SUBJECT_STATS = text(
    """
    SELECT aq.subject_id,
           count(*) FILTER (WHERE aq.selected_option IS NOT NULL) AS answered,
           count(*) FILTER (WHERE aq.selected_option = q.correct_option) AS correct,
           count(DISTINCT aq.question_id) FILTER (WHERE aq.selected_option IS NOT NULL) AS seen
    FROM attempt_questions aq
    JOIN attempts a ON a.id = aq.attempt_id
    JOIN questions q ON q.id = aq.question_id
    WHERE a.user_id = :uid AND (a.status = 'submitted' OR aq.is_checked)
      AND aq.subject_id = ANY(CAST(:sids AS int[]))
    GROUP BY aq.subject_id
    """
)

_BANK = text(
    """
    SELECT subject_id, count(*) FROM questions
    WHERE exam_id = :exam_id AND status = 'published' AND subject_id = ANY(CAST(:sids AS int[]))
    GROUP BY subject_id
    """
)

_DAYS = text(
    """
    SELECT d, sum(n)::int FROM (
      SELECT (aq.answered_at AT TIME ZONE 'Asia/Karachi')::date AS d, count(*) AS n
      FROM attempt_questions aq JOIN attempts a ON a.id = aq.attempt_id
      WHERE a.user_id = :uid AND aq.answered_at > now() - interval '400 days'
        AND aq.selected_option IS NOT NULL
      GROUP BY 1
      UNION ALL
      SELECT (a.started_at AT TIME ZONE 'Asia/Karachi')::date, 0
      FROM attempts a WHERE a.user_id = :uid AND a.started_at > now() - interval '400 days'
    ) x GROUP BY d
    """
)

_TOTALS = text(
    """
    SELECT count(*) FILTER (WHERE a.status = 'submitted') AS completed,
           count(*) FILTER (WHERE a.status = 'submitted' AND a.mode = 'full_mock') AS mocks,
           count(*) FILTER (WHERE a.status = 'submitted' AND a.mode = 'quiz') AS quizzes,
           count(*) FILTER (WHERE a.status = 'submitted' AND a.mode = 'full_mock'
                            AND a.submitted_at >= :week_start) AS mocks_week,
           max(a.submitted_at) FILTER (WHERE a.status = 'submitted'
                                       AND a.mode = 'full_mock') AS last_mock,
           max(r.score * 100.0 / nullif(r.total_marks, 0)) AS best_pct
    FROM attempts a LEFT JOIN results r ON r.attempt_id = a.id
    WHERE a.user_id = :uid
    """
)

_SCORES = text(
    """
    SELECT a.id, a.title, a.mode, a.submitted_at, r.score, r.total_marks
    FROM attempts a JOIN results r ON r.attempt_id = a.id
    WHERE a.user_id = :uid AND a.status = 'submitted' AND r.total_marks > 0
    ORDER BY a.submitted_at DESC LIMIT 10
    """
)


def _streaks(active: set[date], today: date) -> tuple[int, int]:
    current = 0
    d = today if today in active else today - timedelta(days=1)
    while d in active:
        current += 1
        d -= timedelta(days=1)
    best = run = 0
    prev: date | None = None
    for d in sorted(active):
        run = run + 1 if prev is not None and d - prev == timedelta(days=1) else 1
        best = max(best, run)
        prev = d
    return current, max(best, current)


def _pct(a: int, b: int) -> float:
    return round(a * 100.0 / b, 1) if b else 0.0


async def overview(db: AsyncSession, user: User) -> dict:
    t = await get_taxonomy(db)
    cat = _track(t, user)
    bp = t.blueprint(cat["id"])
    sids = [r["subject_id"] for r in bp]
    now_pkt = datetime.now(UTC).astimezone(PKT)
    today = now_pkt.date()
    week_start_day = today - timedelta(days=today.weekday())  # Monday
    week_start = datetime.combine(week_start_day, time.min, PKT)
    p = {"uid": user.id, "sids": sids, "exam_id": cat["exam_id"]}

    stats = {r[0]: r for r in (await db.execute(_SUBJECT_STATS, p)).all()}
    bank = dict((await db.execute(_BANK, p)).all())
    days = {r[0]: r[1] for r in (await db.execute(_DAYS, p)).all()}
    tot = (await db.execute(_TOTALS, {**p, "week_start": week_start})).mappings().one()
    scores = (await db.execute(_SCORES, p)).mappings().all()
    mistake_rows = (
        await db.execute(
            text(_LATEST_CTE + "SELECT count(*), count(*) FILTER (WHERE m.kind = 'wrong') FROM m"),
            p,
        )
    ).one()

    subjects = []
    for r in bp:
        sid = r["subject_id"]
        s = stats.get(sid)
        answered, correct, seen = (s[1], s[2], s[3]) if s else (0, 0, 0)
        subjects.append(
            {
                "id": sid,
                "name": t.subjects[sid]["name"],
                "section": t.sections[r["section_id"]]["name"],
                "answered": answered,
                "correct": correct,
                "accuracy": _pct(correct, answered),
                "seen": seen,
                "bank": bank.get(sid, 0),
                "coverage": min(100.0, _pct(seen, bank.get(sid, 0))),
            }
        )

    answered = sum(s["answered"] for s in subjects)
    correct = sum(s["correct"] for s in subjects)
    seen = sum(s["seen"] for s in subjects)
    bank_total = sum(bank.values())
    weak = sorted(
        (s for s in subjects if s["answered"] >= WEAK_MIN_ANSWERED and s["accuracy"] < WEAK_BELOW),
        key=lambda s: s["accuracy"],
    )[:3]
    strong = sorted(
        (s for s in subjects if s["answered"] >= WEAK_MIN_ANSWERED and s["accuracy"] >= 75),
        key=lambda s: -s["accuracy"],
    )[:3]

    current_streak, best_streak = _streaks(set(days), today)
    today_count = days.get(today, 0)
    week_count = sum(n for d, n in days.items() if d >= week_start_day)
    goal = user.daily_goal

    score_items = [
        {
            "id": r["id"],
            "title": r["title"],
            "mode": r["mode"],
            "date": r["submitted_at"],
            "percent": round(r["score"] * 100 / r["total_marks"]),
        }
        for r in reversed(scores)
    ]
    avg_score = (
        round(sum(s["percent"] for s in score_items) / len(score_items)) if score_items else None
    )

    mistakes_total, mistakes_wrong = mistake_rows
    recs = _recommendations(
        subjects, weak, mistakes_total, tot["last_mock"], answered, today_count, goal, now_pkt
    )
    achievements = _achievements(
        tot["completed"], answered, best_streak, tot["mocks"], tot["best_pct"], subjects
    )

    return {
        "category": {
            "code": cat["code"],
            "name": cat["name"],
            "exam": t.exams[cat["exam_id"]]["code"],
        },
        "progress": {
            "percent": min(100.0, _pct(seen, bank_total)),
            "seen": seen,
            "bank": bank_total,
            "answered": answered,
            "accuracy": _pct(correct, answered),
        },
        "streak": {
            "current": current_streak,
            "best": best_streak,
            "active_today": today in days,
            "last14": [
                {
                    "date": (today - timedelta(days=i)),
                    "count": days.get(today - timedelta(days=i), 0),
                    "active": (today - timedelta(days=i)) in days,
                }
                for i in range(13, -1, -1)
            ],
        },
        "completed": {
            "attempts": tot["completed"],
            "mocks": tot["mocks"],
            "quizzes": tot["quizzes"],
        },
        "scores": {
            "recent": score_items,
            "average": avg_score,
            "best": round(tot["best_pct"]) if tot["best_pct"] is not None else None,
        },
        "subjects": subjects,
        "weak_subjects": weak,
        "strong_subjects": strong,
        "mistakes": {"total": mistakes_total, "wrong": mistakes_wrong},
        "goals": [
            {
                "key": "daily",
                "label": f"Answer {goal} questions today",
                "current": today_count,
                "target": goal,
            },
            {
                "key": "weekly",
                "label": f"Answer {goal * 5} questions this week",
                "current": week_count,
                "target": goal * 5,
            },
            {
                "key": "mock",
                "label": "Take 1 full mock this week",
                "current": tot["mocks_week"],
                "target": 1,
            },
        ],
        "recommendations": recs,
        "achievements": achievements,
    }


def _recommendations(
    subjects: list[dict],
    weak: list[dict],
    mistakes_total: int,
    last_mock: datetime | None,
    answered: int,
    today_count: int,
    goal: int,
    now: datetime,
) -> list[dict]:
    recs: list[dict] = []
    if answered == 0:
        recs.append(
            {
                "kind": "start",
                "title": "Start with a 10-question quiz",
                "body": "A short mixed quiz shows which subjects need the most work.",
                "action": {"type": "practice", "mode": "quiz", "ref_id": None, "count": 10},
            }
        )
    for s in weak[:2]:
        recs.append(
            {
                "kind": "weak",
                "title": f"Strengthen {s['name']}",
                "body": f"Your accuracy is {s['accuracy']:.0f}% over {s['answered']} questions. "
                "Practise 20 more, and read each explanation.",
                "action": {"type": "practice", "mode": "subject", "ref_id": s["id"], "count": 20},
            }
        )
    if mistakes_total:
        recs.append(
            {
                "kind": "mistakes",
                "title": f"Revise {mistakes_total} saved mistake{'s' if mistakes_total != 1 else ''}",
                "body": "Questions you got wrong, skipped or flagged. Get them right to clear them.",
                "action": {"type": "link", "href": "/mistakes"},
            }
        )
    untouched = [s for s in subjects if s["seen"] == 0 and s["bank"] > 0]
    if answered and untouched:
        s = untouched[0]
        recs.append(
            {
                "kind": "new",
                "title": f"Try {s['name']}",
                "body": f"You have not practised {s['name']} yet. {s['bank']} questions are ready.",
                "action": {"type": "practice", "mode": "subject", "ref_id": s["id"], "count": 10},
            }
        )
    if answered >= 30 and (last_mock is None or now - last_mock > timedelta(days=7)):
        recs.append(
            {
                "kind": "mock",
                "title": "Take a full mock test",
                "body": "It has been over a week since your last full mock. Test yourself in real exam timing."
                if last_mock
                else "You have practised enough to try a full mock in real exam timing.",
                "action": {"type": "link", "href": "/mocks"},
            }
        )
    if answered and today_count < goal and len(recs) < 4:
        recs.append(
            {
                "kind": "goal",
                "title": f"{goal - today_count} questions to today's goal",
                "body": "A quick quiz keeps your streak alive.",
                "action": {
                    "type": "practice",
                    "mode": "quiz",
                    "ref_id": None,
                    "count": max(5, min(20, goal - today_count)),
                },
            }
        )
    return recs[:4]


def _achievements(
    completed: int,
    answered: int,
    best_streak: int,
    mocks: int,
    best_pct: float | None,
    subjects: list[dict],
) -> list[dict]:
    explored = bool(subjects) and all(s["seen"] > 0 for s in subjects if s["bank"] > 0)
    items = [
        ("first_step", "First step", "Finish your first session", completed >= 1),
        ("hundred", "Hundred club", "Answer 100 questions", answered >= 100),
        ("streak7", "On fire", "Study 7 days in a row", best_streak >= 7),
        ("mock1", "Exam ready", "Finish a full mock test", mocks >= 1),
        (
            "sharp",
            "Sharp shooter",
            "Score 80% or more in a session",
            best_pct is not None and best_pct >= 80,
        ),
        ("explorer", "Explorer", "Practise every subject in your test", explored),
        ("thousand", "Thousand club", "Answer 1,000 questions", answered >= 1000),
        ("streak30", "Unstoppable", "Study 30 days in a row", best_streak >= 30),
    ]
    return [{"key": k, "title": ti, "description": d, "earned": e} for k, ti, d, e in items]
