import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

EssayType = Literal["argument", "narrative"]


class EssayTopicOption(BaseModel):
    id: int
    prompt: str


class EssayDraft(BaseModel):
    essay_type: EssayType
    topic_id: int | None
    content: str
    word_count: int
    status: str
    max_score: int
    seq: int


class EssaysOut(BaseModel):
    attempt_id: uuid.UUID
    title: str
    mode: str
    status: str  # essay_status of the attempt
    server_now: datetime
    deadline_at: datetime | None
    options: dict[str, list[EssayTopicOption]]
    essays: list[EssayDraft]


class EssaySaveIn(BaseModel):
    topic_id: int | None = None
    content: str = Field(default="", max_length=30000)
    seq: int = Field(ge=1)


class EssaySelfScoreIn(BaseModel):
    # None = random percentage (70-90).
    percent: int | None = Field(default=None, ge=1, le=100)
