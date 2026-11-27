import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import conflict, not_found
from models import (
    Attempt,
    AttemptQuestion,
    EssaySubmission,
    EssayTopic,
    Question,
    Result,
    User,
)
from services import attempt_service
from services.taxonomy import get_taxonomy


async def _attempt_for(db: AsyncSession, user: User, attempt_id: uuid.UUID) -> Attempt:
    stmt = select(Attempt).where(Attempt.id == attempt_id)
    if user.role != "admin":
        stmt = stmt.where(Attempt.user_id == user.id)
    attempt = (await db.execute(stmt)).scalar_one_or_none()
    if attempt is None:
        raise not_found("Result")
    if attempt.status == "in_progress":
        if attempt_service.is_expired(attempt):
            attempt = await attempt_service.submit(db, attempt.user_id, attempt.id)
        else:
            raise conflict("This attempt has not been submitted yet.", "not_submitted")
    return attempt


async def get_result(db: AsyncSession, user: User, attempt_id: uuid.UUID) -> dict:
    attempt = await _attempt_for(db, user, attempt_id)
    result = await db.get(Result, attempt.id)
    if result is None:
        raise not_found("Result")
    t = await get_taxonomy(db)
    cat = t.categories[attempt.category_id]

    essays = []
    if attempt.essay_status != "none":
        rows = (
            await db.execute(
                select(EssaySubmission, EssayTopic.prompt)
                .outerjoin(EssayTopic, EssayTopic.id == EssaySubmission.essay_topic_id)
                .where(EssaySubmission.attempt_id == attempt.id)
                .order_by(EssaySubmission.essay_type)
            )
        ).all()
        essays = [
            {
                "essay_type": s.essay_type,
                "topic": prompt,
                "word_count": s.word_count,
                "status": s.status,
                "score": s.score if s.status == "graded" else None,
                "max_score": s.max_score,
                "feedback": s.feedback if s.status == "graded" else None,
                "content": s.content,
            }
            for s, prompt in rows
        ]

    return {
        "attempt_id": attempt.id,
        "title": attempt.title,
        "mode": attempt.mode,
        "category": {
            "code": cat["code"],
            "name": cat["name"],
            "exam": t.exams[cat["exam_id"]]["code"],
        },
        "started_at": attempt.started_at,
        "submitted_at": attempt.submitted_at,
        "score": result.score,
        "total_marks": result.total_marks,
        "percentage": round(result.score * 100.0 / result.total_marks, 1)
        if result.total_marks
        else 0.0,
        "correct": result.correct,
        "incorrect": result.incorrect,
        "unanswered": result.unanswered,
        "accuracy": result.accuracy,
        "time_used_sec": result.time_used_sec,
        "question_count": attempt.question_count,
        "sections": result.section_breakdown,
        "subjects": result.subject_breakdown,
        "essay_status": attempt.essay_status,
        "essay_score": result.essay_score,
        "essay_total": result.essay_total,
        "essays": essays,
    }


async def get_review(db: AsyncSession, user: User, attempt_id: uuid.UUID) -> dict:
    attempt = await _attempt_for(db, user, attempt_id)
    t = await get_taxonomy(db)
    aq, q = AttemptQuestion, Question
    rows = (
        await db.execute(
            select(
                aq.position,
                aq.section_id,
                aq.subject_id,
                aq.selected_option,
                aq.is_correct,
                aq.is_marked,
                q.topic_id,
                q.stem,
                q.image_url,
                q.option_a,
                q.option_b,
                q.option_c,
                q.option_d,
                q.correct_option,
                q.explanation,
                q.solution,
            )
            .join(q, q.id == aq.question_id)
            .where(aq.attempt_id == attempt.id)
            .order_by(aq.position)
        )
    ).all()
    return {
        "attempt_id": attempt.id,
        "items": [
            {
                "position": r.position,
                "section": t.sections[r.section_id]["name"],
                "subject": t.subjects[r.subject_id]["name"],
                "topic": t.topics.get(r.topic_id, {}).get("name") if r.topic_id else None,
                "stem": r.stem,
                "image_url": r.image_url,
                "options": {"A": r.option_a, "B": r.option_b, "C": r.option_c, "D": r.option_d},
                "selected": r.selected_option,
                "correct": r.correct_option,
                "is_correct": r.is_correct,
                "marked": r.is_marked,
                "explanation": r.explanation,
                "solution": r.solution,
            }
            for r in rows
        ],
    }


async def history(db: AsyncSession, user_id: uuid.UUID, page: int, page_size: int) -> dict:
    t = await get_taxonomy(db)
    rows = (
        await db.execute(
            select(
                Attempt.id,
                Attempt.title,
                Attempt.mode,
                Attempt.category_id,
                Attempt.status,
                Attempt.essay_status,
                Attempt.started_at,
                Attempt.submitted_at,
                Attempt.question_count,
                Result.score,
                Result.total_marks,
                func.count().over().label("total"),
            )
            .outerjoin(Result, Result.attempt_id == Attempt.id)
            .where(Attempt.user_id == user_id)
            .order_by(Attempt.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()
    return {
        "items": [
            {
                "id": r.id,
                "title": r.title,
                "mode": r.mode,
                "category_code": t.categories[r.category_id]["code"],
                "status": r.status,
                "essay_status": r.essay_status,
                "started_at": r.started_at,
                "submitted_at": r.submitted_at,
                "score": r.score,
                "total_marks": r.total_marks,
                "question_count": r.question_count,
            }
            for r in rows
        ],
        "total": rows[0].total if rows else 0,
        "page": page,
        "page_size": page_size,
    }
