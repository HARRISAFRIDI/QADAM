import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    SmallInteger,
    String,
    Text,
    Uuid,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base, TimestampMixin

QUESTION_STATUSES = ("draft", "published", "archived")
DIFFICULTIES = ("easy", "medium", "hard")


class Question(Base, TimestampMixin):
    """Single-correct, 4-option MCQ. Options are embedded (no join needed).

    `correct_option`, `explanation` and `solution` must never be selected by
    student-facing queries before an attempt is submitted (or a practice answer checked).
    """

    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id", ondelete="RESTRICT"))
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="RESTRICT"))
    topic_id: Mapped[int | None] = mapped_column(ForeignKey("topics.id", ondelete="SET NULL"))
    stem: Mapped[str] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(String(500))
    option_a: Mapped[str] = mapped_column(Text)
    option_b: Mapped[str] = mapped_column(Text)
    option_c: Mapped[str] = mapped_column(Text)
    option_d: Mapped[str] = mapped_column(Text)
    correct_option: Mapped[str] = mapped_column(String(1))
    explanation: Mapped[str | None] = mapped_column(Text)
    solution: Mapped[str | None] = mapped_column(Text)
    difficulty: Mapped[str] = mapped_column(String(8), default="medium", server_default="medium")
    marks: Mapped[int] = mapped_column(SmallInteger, default=1, server_default="1")
    status: Mapped[str] = mapped_column(String(12), default="draft", server_default="draft")
    source: Mapped[str | None] = mapped_column(String(255))
    import_batch: Mapped[str | None] = mapped_column(String(40))
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL")
    )
    verified_by: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL")
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint("correct_option IN ('A','B','C','D')", name="correct_option_valid"),
        CheckConstraint("status IN ('draft','published','archived')", name="status_valid"),
        CheckConstraint("difficulty IN ('easy','medium','hard')", name="difficulty_valid"),
        CheckConstraint("marks > 0", name="marks_positive"),
        # Hot path for students: random selection from the published pool.
        Index(
            "ix_questions_published_pool",
            "exam_id",
            "subject_id",
            "topic_id",
            postgresql_where=text("status = 'published'"),
        ),
        # Admin listing / filtering.
        Index("ix_questions_admin", "exam_id", "subject_id", "status", "id"),
        Index("ix_questions_import_batch", "import_batch"),
    )
