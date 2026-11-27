"""Admin: taxonomy editing, mock-test builder, essay topics, students, stats, papers."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import bad_request, conflict, not_found
from models import (
    Attempt,
    Blueprint,
    Category,
    EssaySubmission,
    EssayTopic,
    FileObject,
    MockTest,
    MockTestQuestion,
    Paper,
    Question,
    Subject,
    Topic,
    User,
)
from schemas.admin import (
    BlueprintPatch,
    CategoryPatch,
    EssayTopicIn,
    EssayTopicPatch,
    MockTestIn,
    MockTestPatch,
    PaperIn,
    PaperPatch,
    StudentPatch,
    SubjectIn,
    TopicIn,
    TopicPatch,
)
from services import storage_service
from services import taxonomy as taxonomy_cache
from services.attempt_service import _generated_paper
from services.audit import audit
from services.taxonomy import get_taxonomy
from utils.text import slugify

# ------------------------------------------------------------------ stats


async def stats(db: AsyncSession) -> dict:
    q = select(
        select(func.count()).select_from(User).where(User.role == "student").scalar_subquery().label("students"),
        select(func.count()).select_from(Question).where(Question.status == "published").scalar_subquery().label("published"),
        select(func.count()).select_from(Question).where(Question.status == "draft").scalar_subquery().label("drafts"),
        select(func.count()).select_from(Attempt).scalar_subquery().label("attempts"),
        select(func.count())
        .select_from(Attempt)
        .where(Attempt.created_at > func.now() - func.make_interval(0, 0, 0, 1))
        .scalar_subquery()
        .label("attempts_24h"),
        select(func.count())
        .select_from(Attempt)
        .where(Attempt.essay_status == "submitted")
        .scalar_subquery()
        .label("essays_pending"),
        select(func.count()).select_from(MockTest).where(MockTest.status == "published").scalar_subquery().label("mocks"),
    )
    row = (await db.execute(q)).one()
    t = await get_taxonomy(db)
    by_subject = (
        await db.execute(
            select(Question.exam_id, Question.subject_id, func.count())
            .where(Question.status == "published")
            .group_by(Question.exam_id, Question.subject_id)
        )
    ).all()
    return {
        **row._asdict(),
        "bank": [
            {"exam": t.exams[e]["code"], "subject": t.subjects[s]["name"], "count": n}
            for e, s, n in sorted(by_subject, key=lambda x: (x[0], -x[2]))
        ],
    }


# ------------------------------------------------------------------ taxonomy


async def taxonomy_tree(db: AsyncSession) -> dict:
    t = await get_taxonomy(db)
    topics = (
        await db.execute(select(Topic).order_by(Topic.subject_id, Topic.sort_order, Topic.name))
    ).scalars()
    return {
        "exams": list(t.exams.values()),
        "categories": list(t.categories.values()),
        "sections": list(t.sections.values()),
        "subjects": list(t.subjects.values()),
        "topics": [
            {
                "id": tp.id,
                "subject_id": tp.subject_id,
                "name": tp.name,
                "is_active": tp.is_active,
                "sort_order": tp.sort_order,
            }
            for tp in topics
        ],
        "blueprints": [
            {**b, "category_id": cid} for cid, rows in t.blueprints_by_category.items() for b in rows
        ],
    }


async def patch_category(db: AsyncSession, admin: User, cid: int, data: CategoryPatch) -> None:
    cat = await db.get(Category, cid)
    if cat is None:
        raise not_found("Category")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(cat, k, v)
    audit(db, admin, "category.update", "category", cid, data.model_dump(exclude_unset=True))
    await db.commit()
    taxonomy_cache.invalidate()


async def patch_blueprint(db: AsyncSession, admin: User, bid: int, data: BlueprintPatch) -> None:
    bp = await db.get(Blueprint, bid)
    if bp is None:
        raise not_found("Blueprint")
    bp.mcq_count = data.mcq_count
    audit(db, admin, "blueprint.update", "blueprint", bid, {"mcq_count": data.mcq_count})
    await db.commit()
    taxonomy_cache.invalidate()


async def create_subject(db: AsyncSession, admin: User, data: SubjectIn) -> dict:
    s = Subject(name=data.name.strip(), slug=slugify(data.name))
    db.add(s)
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        raise conflict("A subject with this name already exists") from exc
    audit(db, admin, "subject.create", "subject", s.id)
    await db.commit()
    taxonomy_cache.invalidate()
    return {"id": s.id, "slug": s.slug, "name": s.name}


async def create_topic(db: AsyncSession, admin: User, data: TopicIn) -> dict:
    if await db.get(Subject, data.subject_id) is None:
        raise not_found("Subject")
    tp = Topic(
        subject_id=data.subject_id,
        name=data.name.strip(),
        slug=slugify(data.name),
        parent_id=data.parent_id,
    )
    db.add(tp)
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        raise conflict("This topic already exists for the subject") from exc
    audit(db, admin, "topic.create", "topic", tp.id)
    await db.commit()
    taxonomy_cache.invalidate()
    return {"id": tp.id, "subject_id": tp.subject_id, "name": tp.name, "is_active": True}


async def patch_topic(db: AsyncSession, admin: User, tid: int, data: TopicPatch) -> None:
    tp = await db.get(Topic, tid)
    if tp is None:
        raise not_found("Topic")
    changes = data.model_dump(exclude_unset=True)
    if "name" in changes:
        tp.name = changes["name"].strip()
        tp.slug = slugify(tp.name)
    if "is_active" in changes:
        tp.is_active = changes["is_active"]
    if "sort_order" in changes:
        tp.sort_order = changes["sort_order"]
    audit(db, admin, "topic.update", "topic", tid, changes)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise conflict("Another topic already has this name") from exc
    taxonomy_cache.invalidate()


# ------------------------------------------------------------------ mock tests


async def list_mocks(db: AsyncSession, category: str | None) -> list[dict]:
    t = await get_taxonomy(db)
    stmt = select(MockTest).where(MockTest.status != "archived").order_by(MockTest.id.desc())
    if category:
        stmt = stmt.where(MockTest.category_id == t.category(category)["id"])
    return [
        {
            "id": m.id,
            "category_code": t.categories[m.category_id]["code"],
            "title": m.title,
            "description": m.description,
            "status": m.status,
            "duration_min": m.duration_min,
            "question_count": m.question_count,
            "created_at": m.created_at,
            "published_at": m.published_at,
        }
        for m in (await db.execute(stmt.limit(200))).scalars()
    ]


async def create_mock(db: AsyncSession, admin: User, data: MockTestIn) -> dict:
    t = await get_taxonomy(db)
    cat = t.category(data.category)
    paper = await _generated_paper(db, t, cat)
    if not paper:
        raise bad_request("No published questions are available for this category yet.")
    m = MockTest(
        category_id=cat["id"],
        title=data.title.strip(),
        description=data.description,
        duration_min=data.duration_min or cat["mcq_duration_min"],
        question_count=len(paper),
        created_by=admin.id,
    )
    db.add(m)
    await db.flush()
    db.add_all(
        MockTestQuestion(
            mock_test_id=m.id, position=i, question_id=r["question_id"], section_id=r["section_id"]
        )
        for i, r in enumerate(paper, start=1)
    )
    audit(db, admin, "mock.create", "mock_test", m.id, {"questions": len(paper)})
    await db.commit()
    expected = sum(r["mcq_count"] for r in t.blueprint(cat["id"]))
    return {"id": m.id, "question_count": len(paper), "expected": expected}


async def mock_detail(db: AsyncSession, mock_id: int) -> dict:
    t = await get_taxonomy(db)
    m = await db.get(MockTest, mock_id)
    if m is None:
        raise not_found("Mock test")
    rows = (
        await db.execute(
            select(
                MockTestQuestion.position,
                MockTestQuestion.section_id,
                Question.id,
                Question.subject_id,
                Question.stem,
                Question.option_a,
                Question.option_b,
                Question.option_c,
                Question.option_d,
                Question.correct_option,
                Question.status,
            )
            .join(Question, Question.id == MockTestQuestion.question_id)
            .where(MockTestQuestion.mock_test_id == mock_id)
            .order_by(MockTestQuestion.position)
        )
    ).all()
    return {
        "id": m.id,
        "category_code": t.categories[m.category_id]["code"],
        "title": m.title,
        "description": m.description,
        "status": m.status,
        "duration_min": m.duration_min,
        "question_count": m.question_count,
        "questions": [
            {
                "position": r.position,
                "question_id": r.id,
                "section": t.sections[r.section_id]["name"],
                "subject": t.subjects[r.subject_id]["name"],
                "stem": r.stem,
                "options": {"A": r.option_a, "B": r.option_b, "C": r.option_c, "D": r.option_d},
                "correct": r.correct_option,
                "status": r.status,
            }
            for r in rows
        ],
    }


async def patch_mock(db: AsyncSession, admin: User, mock_id: int, data: MockTestPatch) -> None:
    m = await db.get(MockTest, mock_id)
    if m is None:
        raise not_found("Mock test")
    changes = data.model_dump(exclude_unset=True)
    for k, v in changes.items():
        setattr(m, k, v)
    if changes.get("status") == "published" and m.published_at is None:
        m.published_at = datetime.now(UTC)
    audit(db, admin, "mock.update", "mock_test", mock_id, changes)
    await db.commit()


async def delete_mock(db: AsyncSession, admin: User, mock_id: int) -> None:
    m = await db.get(MockTest, mock_id)
    if m is None:
        raise not_found("Mock test")
    used = await db.scalar(select(func.count()).where(Attempt.mock_test_id == mock_id))
    if used:
        m.status = "archived"  # keep history intact
    else:
        await db.execute(delete(MockTest).where(MockTest.id == mock_id))
    audit(db, admin, "mock.delete", "mock_test", mock_id)
    await db.commit()


# ------------------------------------------------------------------ essay topics


async def list_essay_topics(db: AsyncSession) -> list[dict]:
    t = await get_taxonomy(db)
    rows = (
        await db.execute(
            select(EssayTopic)
            .where(EssayTopic.status != "archived")
            .order_by(EssayTopic.essay_type, EssayTopic.id.desc())
        )
    ).scalars()
    return [
        {
            "id": e.id,
            "exam": t.exams[e.exam_id]["code"],
            "essay_type": e.essay_type,
            "prompt": e.prompt,
            "status": e.status,
        }
        for e in rows
    ]


async def create_essay_topic(db: AsyncSession, admin: User, data: EssayTopicIn) -> dict:
    t = await get_taxonomy(db)
    e = EssayTopic(
        exam_id=t.exam_by_code[data.exam]["id"],
        essay_type=data.essay_type,
        prompt=data.prompt.strip(),
        status=data.status,
        created_by=admin.id,
    )
    db.add(e)
    await db.flush()
    audit(db, admin, "essay_topic.create", "essay_topic", e.id)
    await db.commit()
    return {"id": e.id}


async def patch_essay_topic(db: AsyncSession, admin: User, eid: int, data: EssayTopicPatch) -> None:
    e = await db.get(EssayTopic, eid)
    if e is None:
        raise not_found("Essay topic")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(e, k, v.strip() if isinstance(v, str) else v)
    audit(db, admin, "essay_topic.update", "essay_topic", eid)
    await db.commit()


# ------------------------------------------------------------------ students


async def list_students(db: AsyncSession, q: str | None, page: int, page_size: int) -> dict:
    attempts = (
        select(func.count()).where(Attempt.user_id == User.id).correlate(User).scalar_subquery()
    )
    stmt = select(
        User.id,
        User.full_name,
        User.email,
        User.phone,
        User.city,
        User.role,
        User.is_active,
        User.created_at,
        User.last_login_at,
        attempts.label("attempts"),
        func.count().over().label("total"),
    )
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(User.full_name.ilike(like), User.email.ilike(like)))
    rows = (
        await db.execute(
            stmt.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        )
    ).all()
    return {
        "items": [{k: v for k, v in r._asdict().items() if k != "total"} for r in rows],
        "total": rows[0].total if rows else 0,
        "page": page,
        "page_size": page_size,
    }


async def patch_student(db: AsyncSession, admin: User, uid: uuid.UUID, data: StudentPatch) -> None:
    user = await db.get(User, uid)
    if user is None:
        raise not_found("User")
    if user.id == admin.id:
        raise bad_request("You cannot change your own account here.")
    changes = data.model_dump(exclude_unset=True)
    for k, v in changes.items():
        setattr(user, k, v)
    user.token_version += 1  # force re-login with new permissions
    audit(db, admin, "user.update", "user", uid, changes)
    await db.commit()


# ------------------------------------------------------------------ files & papers


async def create_upload(db: AsyncSession, admin: User, kind: str, filename: str, mime: str, size: int) -> dict:
    storage_service.validate(kind, filename, mime, size)
    bucket = storage_service.bucket_for(kind)
    path = storage_service.build_path(kind, filename)
    upload_url = await storage_service.create_signed_upload(bucket, path)
    f = FileObject(
        bucket=bucket,
        path=path,
        kind=kind,
        original_name=filename,
        mime=mime,
        size_bytes=size,
        uploaded_by=admin.id,
    )
    db.add(f)
    await db.commit()
    return {
        "file_id": f.id,
        "upload_url": upload_url,
        "path": path,
        "public_url": storage_service.public_url(bucket, path) if kind == "question_image" else None,
    }


async def complete_upload(db: AsyncSession, file_id: uuid.UUID) -> dict:
    f = await db.get(FileObject, file_id)
    if f is None:
        raise not_found("File")
    if not await storage_service.object_exists(f.bucket, f.path):
        raise bad_request("The file was not uploaded. Please retry.", "upload_missing")
    f.status = "uploaded"
    await db.commit()
    return {"file_id": f.id, "status": f.status}


async def download_url(db: AsyncSession, file_id: uuid.UUID) -> dict:
    f = await db.get(FileObject, file_id)
    if f is None:
        raise not_found("File")
    return {"url": await storage_service.create_signed_download(f.bucket, f.path)}


async def list_papers(db: AsyncSession) -> list[dict]:
    t = await get_taxonomy(db)
    papers = (
        await db.execute(select(Paper).where(Paper.status != "archived").order_by(Paper.id.desc()).limit(200))
    ).scalars().all()
    file_ids = {
        fid
        for p in papers
        for fid in (p.paper_file_id, p.answer_sheet_file_id, p.solution_file_id)
        if fid
    }
    files = {}
    if file_ids:
        files = {
            f.id: f
            for f in (await db.execute(select(FileObject).where(FileObject.id.in_(file_ids)))).scalars()
        }

    def fdesc(fid):
        f = files.get(fid) if fid else None
        return {"id": f.id, "name": f.original_name, "size": f.size_bytes, "status": f.status} if f else None

    return [
        {
            "id": p.id,
            "title": p.title,
            "exam": t.exams[p.exam_id]["code"],
            "category": t.categories[p.category_id]["code"] if p.category_id else None,
            "subject": t.subjects[p.subject_id]["name"] if p.subject_id in t.subjects else None,
            "year": p.year,
            "duration_min": p.duration_min,
            "total_marks": p.total_marks,
            "status": p.status,
            "paper": fdesc(p.paper_file_id),
            "answer_sheet": fdesc(p.answer_sheet_file_id),
            "solution": fdesc(p.solution_file_id),
            "created_at": p.created_at,
        }
        for p in papers
    ]


async def create_paper(db: AsyncSession, admin: User, data: PaperIn) -> dict:
    expected = {
        data.paper_file_id: "paper",
        data.answer_sheet_file_id: "answer_sheet",
        data.solution_file_id: "solution",
    }
    for fid, kind in expected.items():
        if fid is None:
            continue
        f = await db.get(FileObject, fid)
        if f is None or f.kind != kind:
            raise bad_request(f"Invalid {kind.replace('_', ' ')} file")
    p = Paper(**data.model_dump(), created_by=admin.id)
    db.add(p)
    await db.flush()
    audit(db, admin, "paper.create", "paper", p.id)
    await db.commit()
    return {"id": p.id}


async def patch_paper(db: AsyncSession, admin: User, pid: int, data: PaperPatch) -> None:
    p = await db.get(Paper, pid)
    if p is None:
        raise not_found("Paper")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    audit(db, admin, "paper.update", "paper", pid)
    await db.commit()


async def essay_submission_count(db: AsyncSession) -> int:
    return await db.scalar(
        select(func.count()).select_from(EssaySubmission).where(EssaySubmission.status == "submitted")
    ) or 0
