from datetime import UTC, datetime

from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import bad_request, not_found
from models import Question, User
from schemas.admin import BulkStatusIn, QuestionIn, QuestionPatch
from services.audit import audit
from services.taxonomy import get_taxonomy


async def _validate_refs(db: AsyncSession, exam_id: int, subject_id: int, topic_id: int | None):
    t = await get_taxonomy(db)
    if exam_id not in t.exams:
        raise bad_request("Unknown exam")
    if subject_id not in t.subjects:
        raise bad_request("Unknown subject")
    if topic_id is not None:
        topic = t.topics.get(topic_id)
        if topic is None or topic["subject_id"] != subject_id:
            raise bad_request("Topic does not belong to the selected subject")


async def list_questions(
    db: AsyncSession,
    *,
    exam_id: int | None,
    subject_id: int | None,
    topic_id: int | None,
    status: str | None,
    q: str | None,
    batch: str | None,
    page: int,
    page_size: int,
) -> dict:
    t = await get_taxonomy(db)
    stmt = select(
        Question.id,
        Question.exam_id,
        Question.subject_id,
        Question.topic_id,
        func.left(Question.stem, 220).label("stem"),
        Question.correct_option,
        Question.difficulty,
        Question.status,
        Question.import_batch,
        Question.updated_at,
        func.count().over().label("total"),
    )
    if exam_id:
        stmt = stmt.where(Question.exam_id == exam_id)
    if subject_id:
        stmt = stmt.where(Question.subject_id == subject_id)
    if topic_id:
        stmt = stmt.where(Question.topic_id == topic_id)
    if status:
        stmt = stmt.where(Question.status == status)
    else:
        stmt = stmt.where(Question.status != "archived")
    if batch:
        stmt = stmt.where(Question.import_batch == batch)
    if q:
        term = q.strip()
        if term.isdigit():
            stmt = stmt.where(or_(Question.id == int(term), Question.stem.ilike(f"%{term}%")))
        else:
            stmt = stmt.where(Question.stem.ilike(f"%{term}%"))
    rows = (
        await db.execute(
            stmt.order_by(Question.id.desc()).offset((page - 1) * page_size).limit(page_size)
        )
    ).all()
    return {
        "items": [
            {
                "id": r.id,
                "exam": t.exams[r.exam_id]["code"],
                "subject": t.subjects[r.subject_id]["name"],
                "topic": t.topics.get(r.topic_id, {}).get("name") if r.topic_id else None,
                "stem": r.stem,
                "correct_option": r.correct_option,
                "difficulty": r.difficulty,
                "status": r.status,
                "import_batch": r.import_batch,
                "updated_at": r.updated_at,
            }
            for r in rows
        ],
        "total": rows[0].total if rows else 0,
        "page": page,
        "page_size": page_size,
    }


async def get_question(db: AsyncSession, question_id: int) -> Question:
    q = await db.get(Question, question_id)
    if q is None:
        raise not_found("Question")
    return q


async def create_question(db: AsyncSession, admin: User, data: QuestionIn) -> Question:
    await _validate_refs(db, data.exam_id, data.subject_id, data.topic_id)
    q = Question(**data.model_dump(), created_by=admin.id)
    if q.status == "published":
        q.published_at, q.verified_by = datetime.now(UTC), admin.id
    db.add(q)
    await db.flush()
    audit(db, admin, "question.create", "question", q.id, {"status": q.status})
    await db.commit()
    await db.refresh(q)
    return q


async def update_question(
    db: AsyncSession, admin: User, question_id: int, data: QuestionPatch
) -> Question:
    q = await get_question(db, question_id)
    changes = data.model_dump(exclude_unset=True)
    exam_id = changes.get("exam_id", q.exam_id)
    subject_id = changes.get("subject_id", q.subject_id)
    topic_id = changes.get("topic_id", q.topic_id)
    await _validate_refs(db, exam_id, subject_id, topic_id)
    for k, v in changes.items():
        if isinstance(v, str) and k not in ("explanation", "solution", "source", "image_url"):
            v = v.strip()
        setattr(q, k, v)
    if changes.get("status") == "published" and q.published_at is None:
        q.published_at, q.verified_by = datetime.now(UTC), admin.id
    audit(db, admin, "question.update", "question", q.id, {"fields": sorted(changes)})
    await db.commit()
    await db.refresh(q)
    return q


async def bulk_status(db: AsyncSession, admin: User, data: BulkStatusIn) -> int:
    if not data.ids and not data.batch:
        raise bad_request("Provide question ids or an import batch")
    values: dict = {"status": data.status}
    if data.status == "published":
        values["published_at"] = func.coalesce(Question.published_at, func.now())
        values["verified_by"] = admin.id
    stmt = update(Question).values(**values)
    if data.ids:
        stmt = stmt.where(Question.id.in_(data.ids))
    if data.batch:
        stmt = stmt.where(Question.import_batch == data.batch)
    result = await db.execute(stmt)
    audit(
        db,
        admin,
        "question.bulk_status",
        "question",
        None,
        {"status": data.status, "batch": data.batch, "count": result.rowcount},
    )
    await db.commit()
    return result.rowcount or 0
