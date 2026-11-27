import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from schemas.common import ORM, OptionLetter

QuestionStatus = Literal["draft", "published", "archived"]
Difficulty = Literal["easy", "medium", "hard"]


class QuestionIn(BaseModel):
    exam_id: int
    subject_id: int
    topic_id: int | None = None
    stem: str = Field(min_length=1, max_length=10000)
    image_url: str | None = Field(default=None, max_length=500)
    option_a: str = Field(min_length=1, max_length=2000)
    option_b: str = Field(min_length=1, max_length=2000)
    option_c: str = Field(min_length=1, max_length=2000)
    option_d: str = Field(min_length=1, max_length=2000)
    correct_option: OptionLetter
    explanation: str | None = Field(default=None, max_length=10000)
    solution: str | None = Field(default=None, max_length=20000)
    difficulty: Difficulty = "medium"
    marks: int = Field(default=1, ge=1, le=10)
    status: QuestionStatus = "draft"
    source: str | None = Field(default=None, max_length=255)

    @field_validator("stem", "option_a", "option_b", "option_c", "option_d")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be empty")
        return v


class QuestionPatch(BaseModel):
    exam_id: int | None = None
    subject_id: int | None = None
    topic_id: int | None = None
    stem: str | None = Field(default=None, min_length=1, max_length=10000)
    image_url: str | None = Field(default=None, max_length=500)
    option_a: str | None = Field(default=None, min_length=1, max_length=2000)
    option_b: str | None = Field(default=None, min_length=1, max_length=2000)
    option_c: str | None = Field(default=None, min_length=1, max_length=2000)
    option_d: str | None = Field(default=None, min_length=1, max_length=2000)
    correct_option: OptionLetter | None = None
    explanation: str | None = None
    solution: str | None = None
    difficulty: Difficulty | None = None
    marks: int | None = Field(default=None, ge=1, le=10)
    status: QuestionStatus | None = None
    source: str | None = None


class QuestionAdminOut(ORM):
    id: int
    exam_id: int
    subject_id: int
    topic_id: int | None
    stem: str
    image_url: str | None
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: str
    explanation: str | None
    solution: str | None
    difficulty: str
    marks: int
    status: str
    source: str | None
    import_batch: str | None
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None


class QuestionListItem(BaseModel):
    id: int
    exam: str
    subject: str
    topic: str | None
    stem: str
    correct_option: str
    difficulty: str
    status: str
    import_batch: str | None
    updated_at: datetime


class BulkStatusIn(BaseModel):
    ids: list[int] | None = Field(default=None, max_length=1000)
    batch: str | None = Field(default=None, max_length=40)
    status: QuestionStatus


class CategoryPatch(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    description: str | None = None
    disciplines: list[str] | None = None
    mcq_duration_min: int | None = Field(default=None, ge=1, le=600)
    essay_duration_min: int | None = Field(default=None, ge=1, le=300)
    is_active: bool | None = None


class BlueprintPatch(BaseModel):
    mcq_count: int = Field(ge=1, le=200)


class SubjectIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)


class TopicIn(BaseModel):
    subject_id: int
    name: str = Field(min_length=1, max_length=120)
    parent_id: int | None = None


class TopicPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    is_active: bool | None = None
    sort_order: int | None = None


class MockTestIn(BaseModel):
    category: str = Field(max_length=24)
    title: str = Field(min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=2000)
    duration_min: int | None = Field(default=None, ge=1, le=600)


class MockTestPatch(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = None
    duration_min: int | None = Field(default=None, ge=1, le=600)
    status: QuestionStatus | None = None


class EssayTopicIn(BaseModel):
    exam: str = Field(default="USAT", pattern="^(HAT|USAT)$")
    essay_type: Literal["argument", "narrative"]
    prompt: str = Field(min_length=5, max_length=2000)
    status: QuestionStatus = "published"


class EssayTopicPatch(BaseModel):
    prompt: str | None = Field(default=None, min_length=5, max_length=2000)
    status: QuestionStatus | None = None


class GradeIn(BaseModel):
    score: int = Field(ge=0, le=100)
    feedback: str | None = Field(default=None, max_length=5000)


class StudentPatch(BaseModel):
    is_active: bool | None = None
    role: Literal["student", "admin"] | None = None


class UploadUrlIn(BaseModel):
    kind: Literal["paper", "answer_sheet", "solution", "question_image"]
    filename: str = Field(min_length=1, max_length=255)
    mime: str = Field(max_length=120)
    size_bytes: int = Field(gt=0)


class UploadUrlOut(BaseModel):
    file_id: uuid.UUID
    upload_url: str
    path: str
    public_url: str | None


class PaperIn(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    exam_id: int
    category_id: int | None = None
    section_id: int | None = None
    subject_id: int | None = None
    topic_id: int | None = None
    year: int | None = Field(default=None, ge=1990, le=2100)
    duration_min: int | None = Field(default=None, ge=1, le=600)
    total_marks: int | None = Field(default=None, ge=1, le=1000)
    paper_file_id: uuid.UUID
    answer_sheet_file_id: uuid.UUID | None = None
    solution_file_id: uuid.UUID | None = None
    status: QuestionStatus = "draft"


class PaperPatch(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=200)
    status: QuestionStatus | None = None
    answer_sheet_file_id: uuid.UUID | None = None
    solution_file_id: uuid.UUID | None = None
