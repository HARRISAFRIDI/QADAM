from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

DeckKind = Literal["vocabulary", "formula", "fact"]


class ReviewIn(BaseModel):
    grade: Literal["again", "hard", "good", "easy"]


class DeckIn(BaseModel):
    kind: DeckKind
    title: str = Field(min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=2000)
    exam: Literal["HAT", "USAT"] | None = None  # None = both tests
    subject_id: int | None = None  # None = every category
    status: Literal["draft", "published"] = "draft"
    sort_order: int = Field(default=0, ge=0, le=999)
    cards: str | None = Field(default=None, max_length=200_000)  # "front | back | example" lines


class DeckPatch(BaseModel):
    kind: DeckKind | None = None
    title: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=2000)
    exam: Literal["HAT", "USAT"] | None = None
    subject_id: int | None = None
    status: Literal["draft", "published"] | None = None
    sort_order: int | None = Field(default=None, ge=0, le=999)


class CardIn(BaseModel):
    lines: str = Field(min_length=3, max_length=200_000)


class CardPatch(BaseModel):
    front: str | None = Field(default=None, min_length=1, max_length=4000)
    back: str | None = Field(default=None, min_length=1, max_length=4000)
    example: str | None = Field(default=None, max_length=4000)


class PlanIn(BaseModel):
    kind: Literal["30", "14", "custom"]
    exam_date: date | None = None  # custom: the plan runs until this date
    days: int | None = Field(default=None, ge=7, le=120)  # custom without a date
    daily_minutes: int = Field(default=60, ge=20, le=240)


class TaskDoneIn(BaseModel):
    done: bool = True
