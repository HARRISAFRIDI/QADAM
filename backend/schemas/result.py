import uuid
from datetime import datetime

from pydantic import BaseModel


class Breakdown(BaseModel):
    id: int
    name: str
    total: int
    attempted: int
    correct: int
    incorrect: int
    unanswered: int
    score: int
    max_score: int


class EssayResult(BaseModel):
    essay_type: str
    topic: str | None
    word_count: int
    status: str
    score: int | None
    max_score: int
    feedback: str | None
    content: str


class ResultOut(BaseModel):
    attempt_id: uuid.UUID
    title: str
    mode: str
    category: dict
    started_at: datetime
    submitted_at: datetime | None
    score: int
    total_marks: int
    percentage: float
    correct: int
    incorrect: int
    unanswered: int
    accuracy: float
    time_used_sec: int
    question_count: int
    sections: list[Breakdown]
    subjects: list[Breakdown]
    essay_status: str
    essay_score: int | None
    essay_total: int | None
    essays: list[EssayResult]


class ReviewItem(BaseModel):
    position: int
    section: str
    subject: str
    topic: str | None
    stem: str
    image_url: str | None
    options: dict[str, str]
    selected: str | None
    correct: str
    is_correct: bool | None
    marked: bool
    explanation: str | None
    solution: str | None


class ReviewOut(BaseModel):
    attempt_id: uuid.UUID
    items: list[ReviewItem]


class HistoryItem(BaseModel):
    id: uuid.UUID
    title: str
    mode: str
    category_code: str
    status: str
    essay_status: str
    started_at: datetime
    submitted_at: datetime | None
    score: int | None
    total_marks: int | None
    question_count: int
