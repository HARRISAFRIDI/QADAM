"""Personal study plans: 30-day, 14-day or custom (to an exam date).

A plan is generated once from the category's official weightage (blueprint),
the student's weak subjects and their daily time, then stored as tasks.

Week shape: study days rotate through subjects (weighted by how many MCQs each
has in the real test; weak subjects get 1.5x), with a mixed quiz and flashcards.
USAT plans add an essay every 4th study day. Every 7th day is a full mock, the
day after it revises the mistakes. The last third of the plan practises whole
sections (exam mode), and the last day is a light final revision.

A task is done when the student ticks it, or when the session started from it
is submitted.
"""

import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppError, bad_request, not_found
from models import StudyPlan, StudyPlanTask, User
from schemas.attempt import FullMockIn, PracticeIn
from schemas.memorize import PlanIn
from services import attempt_service, memorize_service, progress_service
from services.taxonomy import Taxonomy, get_taxonomy

MIN_PER_QUESTION = 1.5  # answer + read the explanation
MEMORIZE_MIN = 10
MEMORIZE_CARDS = 20


def today_pkt() -> date:
    return datetime.now(UTC).astimezone(progress_service.PKT).date()


def _round5(x: float, lo: int, hi: int) -> int:
    return int(max(lo, min(hi, 5 * round(x / 5))))


class _Rotation:
    """Smooth weighted round robin: fair, deterministic, weight-proportional."""

    def __init__(self, items: list[tuple[int, str, float]]):
        self.items = items
        self.current = [0.0] * len(items)
        self.total = sum(w for _, _, w in items)

    def next(self) -> tuple[int, str]:
        for i, (_, _, w) in enumerate(self.items):
            self.current[i] += w
        best = max(range(len(self.items)), key=lambda i: self.current[i])
        self.current[best] -= self.total
        return self.items[best][0], self.items[best][1]


def build_tasks(
    t: Taxonomy,
    cat: dict,
    days: int,
    minutes: int,
    weak_ids: set[int],
    has_cards: bool,
) -> list[dict]:
    bp = t.blueprint(cat["id"])
    if not bp:
        raise bad_request("This category has no subjects yet.", "no_blueprint")
    subjects = _Rotation(
        [
            (r["subject_id"], t.subjects[r["subject_id"]]["name"], r["mcq_count"] * (1.5 if r["subject_id"] in weak_ids else 1.0))
            for r in bp
        ]
    )
    sec_weight: dict[int, int] = {}
    for r in bp:
        sec_weight[r["section_id"]] = sec_weight.get(r["section_id"], 0) + r["mcq_count"]
    sections = _Rotation([(sid, t.sections[sid]["name"], float(w)) for sid, w in sec_weight.items()])
    essays = bool(cat["essay_duration_min"])
    mock_min = cat["mcq_duration_min"] + (cat["essay_duration_min"] or 0)

    mock_days = {d for d in range(7, days, 7)}
    if days >= 10:
        mock_days.add(days - 1)
    exam_mode_from = days - max(3, days // 3) + 1

    tasks: list[dict] = []
    study_day = 0
    for day in range(1, days + 1):
        day_tasks: list[dict] = []
        budget = minutes
        if has_cards:
            day_tasks.append(
                {"kind": "memorize", "title": f"Review flashcards ({MEMORIZE_CARDS} cards)",
                 "ref_id": None, "count": MEMORIZE_CARDS, "minutes": MEMORIZE_MIN}
            )
            budget -= MEMORIZE_MIN
        if day == days:
            day_tasks.insert(0, {"kind": "mistakes", "title": "Final revision: your saved mistakes",
                                 "ref_id": None, "count": 20, "minutes": 30})
            day_tasks.insert(1, {"kind": "quiz", "title": "Light warm-up quiz (10 questions)",
                                 "ref_id": None, "count": 10, "minutes": 15})
        elif day in mock_days:
            day_tasks.insert(0, {"kind": "mock", "title": f"Full mock test ({cat['code']}, {mock_min} min)",
                                 "ref_id": None, "count": None, "minutes": mock_min})
        else:
            study_day += 1
            after_mock = (day - 1) in mock_days
            if after_mock:
                day_tasks.insert(0, {"kind": "mistakes", "title": "Revise the mistakes from your mock",
                                     "ref_id": None, "count": 20, "minutes": 30})
                budget -= 30
            q_main = _round5(max(budget, 20) * 0.6 / MIN_PER_QUESTION, 10, 50)
            if day >= exam_mode_from:
                sid, name = sections.next()
                main = {"kind": "practice_section", "title": f"{name}: section practice ({q_main} questions)",
                        "ref_id": sid, "count": q_main}
            else:
                sid, name = subjects.next()
                main = {"kind": "practice_subject", "title": f"{name} practice ({q_main} questions)",
                        "ref_id": sid, "count": q_main}
            main["minutes"] = round(q_main * MIN_PER_QUESTION)
            day_tasks.insert(0 if not after_mock else 1, main)
            budget -= main["minutes"]
            if essays and study_day % 4 == 0:
                day_tasks.insert(len(day_tasks) - (1 if has_cards else 0),
                                 {"kind": "essay", "title": "Essay practice (argument + narrative)",
                                  "ref_id": None, "count": None, "minutes": cat["essay_duration_min"]})
            elif budget >= 10:
                q_quiz = _round5(budget / MIN_PER_QUESTION, 5, 30)
                day_tasks.insert(len(day_tasks) - (1 if has_cards else 0),
                                 {"kind": "quiz", "title": f"Mixed quiz ({q_quiz} questions)",
                                  "ref_id": None, "count": q_quiz, "minutes": round(q_quiz * MIN_PER_QUESTION)})
        for pos, task in enumerate(day_tasks, start=1):
            tasks.append({**task, "day": day, "position": pos})
    return tasks


# ------------------------------------------------------------ CRUD


async def _active(db: AsyncSession, user_id: uuid.UUID) -> StudyPlan | None:
    return (
        await db.execute(
            select(StudyPlan).where(StudyPlan.user_id == user_id, StudyPlan.status == "active")
        )
    ).scalar_one_or_none()


async def create(db: AsyncSession, user: User, data: PlanIn) -> dict:
    t = await get_taxonomy(db)
    cat = progress_service._track(t, user)
    start = today_pkt()
    if data.kind == "custom":
        if data.exam_date is not None:
            days = (data.exam_date - start).days
            if not 7 <= days <= 120:
                raise bad_request("Pick an exam date between 7 and 120 days from today.", "bad_exam_date")
        else:
            days = data.days or 21
    else:
        days = int(data.kind)

    stats = await progress_service.overview(db, user)
    weak = {s["id"] for s in stats["weak_subjects"]}
    has_cards = (await memorize_service.decks(db, user))["totals"]["cards"] > 0

    await db.execute(
        update(StudyPlan)
        .where(StudyPlan.user_id == user.id, StudyPlan.status == "active")
        .values(status="archived")
    )
    plan = StudyPlan(
        user_id=user.id,
        category_id=cat["id"],
        kind=data.kind,
        start_date=start,
        days=days,
        exam_date=data.exam_date,
        daily_minutes=data.daily_minutes,
    )
    db.add(plan)
    await db.flush()
    for task in build_tasks(t, cat, days, data.daily_minutes, weak, has_cards):
        db.add(StudyPlanTask(plan_id=plan.id, **task))
    await db.commit()
    return await current(db, user)


async def archive(db: AsyncSession, user: User) -> None:
    await db.execute(
        update(StudyPlan)
        .where(StudyPlan.user_id == user.id, StudyPlan.status == "active")
        .values(status="archived")
    )
    await db.commit()


_TASKS_SQL = text(
    """
    SELECT t.id, t.day, t.position, t.kind, t.title, t.ref_id, t.count, t.minutes,
           t.attempt_id, t.done_at, a.status AS attempt_status, a.essay_status,
           (t.done_at IS NOT NULL
            OR (a.id IS NOT NULL AND (
                 (a.mode = 'essay' AND a.essay_status IN ('submitted','graded'))
              OR (a.mode <> 'essay' AND a.status = 'submitted')))) AS done
    FROM study_plan_tasks t LEFT JOIN attempts a ON a.id = t.attempt_id
    WHERE t.plan_id = :pid
    ORDER BY t.day, t.position
    """
)


def _task_out(r) -> dict:
    in_progress = r["attempt_id"] is not None and not r["done"] and (
        r["attempt_status"] == "in_progress" or r["essay_status"] in ("pending", "in_progress")
    )
    return {
        "id": r["id"],
        "kind": r["kind"],
        "title": r["title"],
        "ref_id": r["ref_id"],
        "count": r["count"],
        "minutes": r["minutes"],
        "done": r["done"],
        "manual": r["done_at"] is not None,
        "attempt_id": r["attempt_id"],
        "in_progress": in_progress,
    }


async def current(db: AsyncSession, user: User) -> dict:
    plan = await _active(db, user.id)
    if plan is None:
        raise not_found("Study plan")
    t = await get_taxonomy(db)
    rows = (await db.execute(_TASKS_SQL, {"pid": plan.id})).mappings().all()
    today = today_pkt()
    today_day = max(1, min(plan.days, (today - plan.start_date).days + 1))
    finished = (today - plan.start_date).days + 1 > plan.days
    days: dict[int, list[dict]] = {}
    for r in rows:
        days.setdefault(r["day"], []).append(_task_out(r))
    done = sum(1 for r in rows if r["done"])
    due_so_far = sum(1 for r in rows if r["day"] <= today_day)
    done_so_far = sum(1 for r in rows if r["day"] <= today_day and r["done"])
    cat = t.categories.get(plan.category_id, {})
    return {
        "id": plan.id,
        "kind": plan.kind,
        "days": plan.days,
        "start_date": plan.start_date,
        "end_date": plan.start_date + timedelta(days=plan.days - 1),
        "exam_date": plan.exam_date,
        "daily_minutes": plan.daily_minutes,
        "category": cat.get("code"),
        "matches_track": plan.category_id == user.preferred_category_id,
        "today": today_day,
        "finished": finished,
        "progress": {
            "done": done,
            "total": len(rows),
            "percent": round(done * 100 / len(rows)) if rows else 0,
            "behind": max(0, due_so_far - done_so_far - len(days.get(today_day, []))),
        },
        "schedule": [
            {
                "day": d,
                "date": plan.start_date + timedelta(days=d - 1),
                "tasks": tasks,
                "done": all(x["done"] for x in tasks),
            }
            for d, tasks in sorted(days.items())
        ],
    }


async def today_summary(db: AsyncSession, user: User) -> dict | None:
    """Today's tasks for the dashboard, or None without a plan."""
    try:
        plan = await current(db, user)
    except AppError as exc:
        if exc.status == 404:  # no plan yet: the normal case
            return None
        raise
    day = next((d for d in plan["schedule"] if d["day"] == plan["today"]), None)
    return {
        "day": plan["today"],
        "days": plan["days"],
        "percent": plan["progress"]["percent"],
        "behind": plan["progress"]["behind"],
        "finished": plan["finished"],
        "tasks": day["tasks"] if day else [],
    }


async def _own_task(db: AsyncSession, user: User, task_id: int) -> tuple[StudyPlanTask, StudyPlan]:
    row = (
        await db.execute(
            select(StudyPlanTask, StudyPlan)
            .join(StudyPlan, StudyPlan.id == StudyPlanTask.plan_id)
            .where(StudyPlanTask.id == task_id, StudyPlan.user_id == user.id)
        )
    ).first()
    if row is None:
        raise not_found("Task")
    return row[0], row[1]


async def set_done(db: AsyncSession, user: User, task_id: int, done: bool) -> dict:
    task, _ = await _own_task(db, user, task_id)
    task.done_at = datetime.now(UTC) if done else None
    if not done:
        task.attempt_id = None  # un-ticking also forgets a submitted session
    await db.commit()
    return {"id": task.id, "done": done}


async def start(db: AsyncSession, user: User, task_id: int) -> dict:
    """Start (or resume) the session behind a task. Returns where to go next."""
    task, plan = await _own_task(db, user, task_id)
    if task.kind == "memorize":
        return {"href": "/memorize/review", "attempt_id": None}
    t = await get_taxonomy(db)
    cat = t.categories.get(plan.category_id)
    if cat is None:
        raise not_found("Category")
    code = cat["code"]

    if task.attempt_id is not None:
        r = (
            await db.execute(
                text("SELECT status, essay_status, mode FROM attempts WHERE id = :id"),
                {"id": task.attempt_id},
            )
        ).first()
        if r is not None:
            if r.mode == "essay" and r.essay_status in ("pending", "in_progress"):
                return {"href": f"/attempt/{task.attempt_id}/essays", "attempt_id": task.attempt_id}
            if r.mode != "essay" and r.status == "in_progress":
                return {"href": f"/attempt/{task.attempt_id}", "attempt_id": task.attempt_id}

    if task.kind == "mock":
        attempt, _ = await attempt_service.create_full_mock(db, user, FullMockIn(category=code))
    elif task.kind == "essay":
        attempt = await attempt_service.create_essay_practice(db, user, code)
    else:
        mode = {
            "practice_subject": "subject",
            "practice_section": "section",
            "quiz": "quiz",
            "mistakes": "mistakes",
        }[task.kind]
        data = PracticeIn(category=code, mode=mode, ref_id=task.ref_id, count=task.count or 20)
        try:
            attempt = await attempt_service.create_practice(db, user, data)
        except AppError as exc:
            # An empty notebook is good news: do a mixed quiz instead.
            if mode == "mistakes" and exc.code == "no_mistakes":
                attempt = await attempt_service.create_practice(
                    db, user, PracticeIn(category=code, mode="quiz", count=task.count or 20)
                )
            else:
                raise
    await db.execute(
        update(StudyPlanTask).where(StudyPlanTask.id == task.id).values(attempt_id=attempt.id)
    )
    await db.commit()
    href = f"/attempt/{attempt.id}/essays" if task.kind == "essay" else f"/attempt/{attempt.id}"
    return {"href": href, "attempt_id": attempt.id}
