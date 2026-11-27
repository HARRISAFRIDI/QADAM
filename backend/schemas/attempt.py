import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from schemas.common import OptionLetter


class PracticeIn(BaseModel):
    category: str = Field(max_length=24)
    mode: Literal["subject", "section"]
    ref_id: int  # subject_id / section_id
    count: int = Field(default=20, ge=5, le=100)
    timed: bool = False


class FullMockIn(BaseModel):
    category: str = Field(max_length=24)
    mock_test_id: int | None = None


class EssayPracticeIn(BaseModel):
    category: str = Field(max_length=24)


class AttemptCreated(BaseModel):
    id: uuid.UUID
    resumed: bool = False


class QuestionForAttempt(BaseModel):
    """What a student sees during an attempt. Never includes the answer key."""

    position: int
    section_id: int
    subject_id: int
    stem: str
    image_url: str | None
    options: dict[str, str]  # {"A": "...", ...}
    selected: OptionLetter | None
    marked: bool
    seq: int
    # Practice only, after "Check answer":
    checked: bool = False
    correct: OptionLetter | None = None
    explanation: str | None = None


class AttemptOut(BaseModel):
    id: uuid.UUID
    title: str
    mode: str
    status: str
    essay_status: str
    category: dict  # {code, name, exam}
    started_at: datetime
    deadline_at: datetime | None
    server_now: datetime
    sections: list[dict]  # [{id, name}]
    subjects: list[dict]  # [{id, name}]
    questions: list[QuestionForAttempt]


class AnswerIn(BaseModel):
    position: int = Field(ge=1, le=500)
    selected: OptionLetter | None
    marked: bool = False
    seq: int = Field(ge=1)


class SaveAnswersIn(BaseModel):
    answers: list[AnswerIn] = Field(min_length=1, max_length=200)


class SaveAnswersOut(BaseModel):
    saved: int
    server_now: datetime


class CheckOut(BaseModel):
    position: int
    selected: OptionLetter | None
    correct: OptionLetter
    is_correct: bool
    explanation: str | None
    solution: str | None


class CheckIn(BaseModel):
    selected: OptionLetter
    seq: int = Field(ge=1)


class SubmitOut(BaseModel):
    attempt_id: uuid.UUID
    next: Literal["results", "essays"]
