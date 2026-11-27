from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models import EssayTopic, MockTest, Question
from services.taxonomy import Taxonomy, get_taxonomy


def _sections_summary(t: Taxonomy, category_id: int) -> list[dict]:
    out: dict[int, dict] = {}
    for row in t.blueprint(category_id):
        sec = t.sections[row["section_id"]]
        entry = out.setdefault(sec["id"], {"code": sec["code"], "name": sec["name"], "mcq_count": 0})
        entry["mcq_count"] += row["mcq_count"]
    return list(out.values())


async def list_exams(db: AsyncSession) -> list[dict]:
    t = await get_taxonomy(db)
    result = []
    for exam in t.exams.values():
        cats = []
        for c in t.categories.values():
            if c["exam_id"] != exam["id"] or not c["is_active"]:
                continue
            sections = _sections_summary(t, c["id"])
            cats.append(
                {
                    **{k: c[k] for k in ("id", "code", "name", "description", "disciplines")},
                    "mcq_duration_min": c["mcq_duration_min"],
                    "essay_duration_min": c["essay_duration_min"],
                    "total_mcqs": sum(s["mcq_count"] for s in sections),
                    "sections": sections,
                }
            )
        result.append({**exam, "categories": cats})
    return result


async def category_overview(db: AsyncSession, code: str) -> dict:
    t = await get_taxonomy(db)
    cat = t.category(code)
    exam = t.exams[cat["exam_id"]]
    bp = t.blueprint(cat["id"])
    subject_ids = [r["subject_id"] for r in bp]

    # One grouped query gives availability per subject and per topic.
    counts: dict[tuple[int, int | None], int] = {}
    if subject_ids:
        rows = await db.execute(
            select(Question.subject_id, Question.topic_id, func.count())
            .where(
                Question.exam_id == exam["id"],
                Question.status == "published",
                Question.subject_id.in_(subject_ids),
            )
            .group_by(Question.subject_id, Question.topic_id)
        )
        for subject_id, topic_id, n in rows:
            counts[(subject_id, topic_id)] = n

    sections: dict[int, dict] = {}
    for row in bp:
        sec = t.sections[row["section_id"]]
        subj = t.subjects[row["subject_id"]]
        available = sum(n for (s, _), n in counts.items() if s == subj["id"])
        topics = [
            {"id": tp["id"], "name": tp["name"], "available": counts.get((subj["id"], tp["id"]), 0)}
            for tp in t.topics_by_subject.get(subj["id"], [])
        ]
        entry = sections.setdefault(
            sec["id"],
            {
                "id": sec["id"],
                "code": sec["code"],
                "name": sec["name"],
                "mcq_count": 0,
                "available": 0,
                "subjects": [],
            },
        )
        entry["mcq_count"] += row["mcq_count"]
        entry["available"] += available
        entry["subjects"].append(
            {
                "id": subj["id"],
                "slug": subj["slug"],
                "name": subj["name"],
                "mcq_count": row["mcq_count"],
                "available": available,
                "topics": topics,
            }
        )

    mocks = (
        await db.execute(
            select(
                MockTest.id,
                MockTest.title,
                MockTest.description,
                MockTest.duration_min,
                MockTest.question_count,
            )
            .where(MockTest.category_id == cat["id"], MockTest.status == "published")
            .order_by(MockTest.published_at.desc())
            .limit(50)
        )
    ).mappings()

    essays = None
    if cat["essay_duration_min"]:
        ec = dict(
            (
                await db.execute(
                    select(EssayTopic.essay_type, func.count())
                    .where(EssayTopic.exam_id == exam["id"], EssayTopic.status == "published")
                    .group_by(EssayTopic.essay_type)
                )
            ).all()
        )
        essays = {
            "argument": ec.get("argument", 0),
            "narrative": ec.get("narrative", 0),
            "duration_min": cat["essay_duration_min"],
        }

    secs = list(sections.values())
    return {
        "exam": {"id": exam["id"], "code": exam["code"], "name": exam["name"]},
        "category": {
            k: cat[k]
            for k in (
                "id",
                "code",
                "name",
                "description",
                "disciplines",
                "mcq_duration_min",
                "essay_duration_min",
            )
        },
        "total_mcqs": sum(s["mcq_count"] for s in secs),
        "total_available": sum(s["available"] for s in secs),
        "sections": secs,
        "mocks": [dict(m) for m in mocks],
        "essays": essays,
    }
