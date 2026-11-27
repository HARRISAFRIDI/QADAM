"""Admin API. Every route requires an authenticated admin (checked against the DB)."""

import uuid

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile

from api.dependencies import DB, AdminUser, require_admin
from core.config import get_settings
from core.errors import bad_request
from schemas.admin import (
    BlueprintPatch,
    BulkStatusIn,
    CategoryPatch,
    EssayTopicIn,
    EssayTopicPatch,
    GradeIn,
    MockTestIn,
    MockTestPatch,
    PaperIn,
    PaperPatch,
    QuestionAdminOut,
    QuestionIn,
    QuestionListItem,
    QuestionPatch,
    StudentPatch,
    SubjectIn,
    TopicIn,
    TopicPatch,
    UploadUrlIn,
    UploadUrlOut,
)
from schemas.common import OkResponse, Page
from services import admin_service, essay_service, import_service, question_service

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])

MAX_IMPORT_BYTES = 4 * 1024 * 1024  # Vercel request body limit is ~4.5 MB


@router.get("/stats")
async def stats(db: DB) -> dict:
    return await admin_service.stats(db)


@router.get("/system")
async def system() -> dict:
    return {"storage_enabled": get_settings().storage_enabled}


# ---------------------------------------------------------------- taxonomy


@router.get("/taxonomy")
async def taxonomy(db: DB) -> dict:
    return await admin_service.taxonomy_tree(db)


@router.patch("/categories/{cid}", response_model=OkResponse)
async def patch_category(cid: int, data: CategoryPatch, admin: AdminUser, db: DB):
    await admin_service.patch_category(db, admin, cid, data)
    return OkResponse()


@router.patch("/blueprints/{bid}", response_model=OkResponse)
async def patch_blueprint(bid: int, data: BlueprintPatch, admin: AdminUser, db: DB):
    await admin_service.patch_blueprint(db, admin, bid, data)
    return OkResponse()


@router.post("/subjects", status_code=201)
async def create_subject(data: SubjectIn, admin: AdminUser, db: DB) -> dict:
    return await admin_service.create_subject(db, admin, data)


@router.post("/topics", status_code=201)
async def create_topic(data: TopicIn, admin: AdminUser, db: DB) -> dict:
    return await admin_service.create_topic(db, admin, data)


@router.patch("/topics/{tid}", response_model=OkResponse)
async def patch_topic(tid: int, data: TopicPatch, admin: AdminUser, db: DB):
    await admin_service.patch_topic(db, admin, tid, data)
    return OkResponse()


# ---------------------------------------------------------------- questions


@router.get("/questions", response_model=Page[QuestionListItem])
async def list_questions(
    db: DB,
    exam_id: int | None = None,
    subject_id: int | None = None,
    topic_id: int | None = None,
    status: str | None = Query(None, pattern="^(draft|published|archived)$"),
    q: str | None = Query(None, max_length=200),
    batch: str | None = Query(None, max_length=40),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
):
    return await question_service.list_questions(
        db,
        exam_id=exam_id,
        subject_id=subject_id,
        topic_id=topic_id,
        status=status,
        q=q,
        batch=batch,
        page=page,
        page_size=page_size,
    )


@router.get("/questions/{qid}", response_model=QuestionAdminOut)
async def get_question(qid: int, db: DB):
    return await question_service.get_question(db, qid)


@router.post("/questions", response_model=QuestionAdminOut, status_code=201)
async def create_question(data: QuestionIn, admin: AdminUser, db: DB):
    return await question_service.create_question(db, admin, data)


@router.patch("/questions/{qid}", response_model=QuestionAdminOut)
async def update_question(qid: int, data: QuestionPatch, admin: AdminUser, db: DB):
    return await question_service.update_question(db, admin, qid, data)


@router.post("/questions/bulk-status")
async def bulk_status(data: BulkStatusIn, admin: AdminUser, db: DB) -> dict:
    return {"updated": await question_service.bulk_status(db, admin, data)}


@router.post("/questions/import")
async def import_questions(
    admin: AdminUser,
    db: DB,
    file: UploadFile = File(...),
    answer_file: UploadFile | None = File(None),
    exam: str | None = Form(None),
    subject: str | None = Form(None, max_length=120),
    topic: str | None = Form(None, max_length=120),
    dry_run: bool = Form(True),
    create_topics: bool = Form(True),
    skip_invalid: bool = Form(False),
) -> dict:
    data = await file.read(MAX_IMPORT_BYTES + 1)
    answer_data = await answer_file.read(MAX_IMPORT_BYTES + 1) if answer_file else None
    if len(data) + len(answer_data or b"") > MAX_IMPORT_BYTES:
        raise bad_request("Files are larger than 4 MB in total. Split them into smaller files.")
    return await import_service.run_import(
        db,
        admin,
        filename=file.filename or "upload.csv",
        data=data,
        default_exam=exam,
        default_subject=subject or None,
        default_topic=topic or None,
        answer_filename=answer_file.filename if answer_file else None,
        answer_data=answer_data,
        dry_run=dry_run,
        create_topics=create_topics,
        skip_invalid=skip_invalid,
    )


# ---------------------------------------------------------------- mock tests


@router.get("/mock-tests")
async def list_mocks(db: DB, category: str | None = None) -> list[dict]:
    return await admin_service.list_mocks(db, category)


@router.post("/mock-tests", status_code=201)
async def create_mock(data: MockTestIn, admin: AdminUser, db: DB) -> dict:
    return await admin_service.create_mock(db, admin, data)


@router.get("/mock-tests/{mid}")
async def mock_detail(mid: int, db: DB) -> dict:
    return await admin_service.mock_detail(db, mid)


@router.patch("/mock-tests/{mid}", response_model=OkResponse)
async def patch_mock(mid: int, data: MockTestPatch, admin: AdminUser, db: DB):
    await admin_service.patch_mock(db, admin, mid, data)
    return OkResponse()


@router.delete("/mock-tests/{mid}", response_model=OkResponse)
async def delete_mock(mid: int, admin: AdminUser, db: DB):
    await admin_service.delete_mock(db, admin, mid)
    return OkResponse()


# ---------------------------------------------------------------- essays


@router.get("/essay-topics")
async def list_essay_topics(db: DB) -> list[dict]:
    return await admin_service.list_essay_topics(db)


@router.post("/essay-topics", status_code=201)
async def create_essay_topic(data: EssayTopicIn, admin: AdminUser, db: DB) -> dict:
    return await admin_service.create_essay_topic(db, admin, data)


@router.patch("/essay-topics/{eid}", response_model=OkResponse)
async def patch_essay_topic(eid: int, data: EssayTopicPatch, admin: AdminUser, db: DB):
    await admin_service.patch_essay_topic(db, admin, eid, data)
    return OkResponse()


@router.get("/essays")
async def grading_queue(
    db: DB,
    status: str = Query("submitted", pattern="^(submitted|graded|in_progress)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
) -> dict:
    return await essay_service.grading_queue(db, status, page, page_size)


@router.get("/essays/{attempt_id}")
async def attempt_essays(attempt_id: uuid.UUID, db: DB) -> dict:
    return await essay_service.attempt_essays_for_admin(db, attempt_id)


@router.post("/essays/submissions/{sid}/grade", response_model=OkResponse)
async def grade_essay(sid: int, data: GradeIn, admin: AdminUser, db: DB):
    await essay_service.grade(db, admin, sid, data.score, data.feedback)
    return OkResponse()


# ---------------------------------------------------------------- students


@router.get("/students")
async def list_students(
    db: DB,
    q: str | None = Query(None, max_length=120),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
) -> dict:
    return await admin_service.list_students(db, q, page, page_size)


@router.patch("/students/{uid}", response_model=OkResponse)
async def patch_student(uid: uuid.UUID, data: StudentPatch, admin: AdminUser, db: DB):
    await admin_service.patch_student(db, admin, uid, data)
    return OkResponse()


# ---------------------------------------------------------------- files & papers


@router.post("/files/upload-url", response_model=UploadUrlOut)
async def upload_url(data: UploadUrlIn, admin: AdminUser, db: DB):
    return await admin_service.create_upload(
        db, admin, data.kind, data.filename, data.mime, data.size_bytes
    )


@router.post("/files/{file_id}/complete")
async def complete_upload(file_id: uuid.UUID, db: DB) -> dict:
    return await admin_service.complete_upload(db, file_id)


@router.get("/files/{file_id}/download")
async def download(file_id: uuid.UUID, db: DB) -> dict:
    return await admin_service.download_url(db, file_id)


@router.get("/papers")
async def list_papers(db: DB) -> list[dict]:
    return await admin_service.list_papers(db)


@router.post("/papers", status_code=201)
async def create_paper(data: PaperIn, admin: AdminUser, db: DB) -> dict:
    return await admin_service.create_paper(db, admin, data)


@router.patch("/papers/{pid}", response_model=OkResponse)
async def patch_paper(pid: int, data: PaperPatch, admin: AdminUser, db: DB):
    await admin_service.patch_paper(db, admin, pid, data)
    return OkResponse()
