"""Attempts (practice + mock), per-question answers, results and essays."""

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Identity,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base, TimestampMixin
from utils.ids import uuid7

ATTEMPT_MODES = ("topic", "subject", "section", "full_mock", "essay")


class MockTest(Base, TimestampMixin):
    """Admin-curated fixed paper (frozen question list)."""

    __tablename__ = "mock_tests"

    id: Mapped[int] = mapped_column(Integer, Identity(), primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(12), default="draft", server_default="draft")
    duration_min: Mapped[int] = mapped_column(SmallInteger)
    question_count: Mapped[int] = mapped_column(SmallInteger, default=0, server_default="0")
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL")
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint("status IN ('draft','published','archived')", name="status_valid"),
        Index("ix_mock_tests_category_status", "category_id", "status"),
    )


class MockTestQuestion(Base):
    __tablename__ = "mock_test_questions"

    mock_test_id: Mapped[int] = mapped_column(
        ForeignKey("mock_tests.id", ondelete="CASCADE"), primary_key=True
    )
    position: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    question_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("questions.id", ondelete="RESTRICT"), index=True
    )
    section_id: Mapped[int] = mapped_column(ForeignKey("sections.id", ondelete="RESTRICT"))


class EssayTopic(Base, TimestampMixin):
    __tablename__ = "essay_topics"

    id: Mapped[int] = mapped_column(Integer, Identity(), primary_key=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id", ondelete="RESTRICT"))
    essay_type: Mapped[str] = mapped_column(String(12))
    prompt: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(12), default="published", server_default="published")
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL")
    )

    __table_args__ = (
        CheckConstraint("essay_type IN ('argument','narrative')", name="essay_type_valid"),
        CheckConstraint("status IN ('draft','published','archived')", name="status_valid"),
        Index("ix_essay_topics_pool", "exam_id", "essay_type", "status"),
    )


class Attempt(Base):
    __tablename__ = "attempts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid7)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"))
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="RESTRICT"))
    mock_test_id: Mapped[int | None] = mapped_column(
        ForeignKey("mock_tests.id", ondelete="SET NULL")
    )
    mode: Mapped[str] = mapped_column(String(12))
    section_id: Mapped[int | None] = mapped_column(ForeignKey("sections.id", ondelete="SET NULL"))
    subject_id: Mapped[int | None] = mapped_column(ForeignKey("subjects.id", ondelete="SET NULL"))
    topic_id: Mapped[int | None] = mapped_column(ForeignKey("topics.id", ondelete="SET NULL"))
    title: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(12), default="in_progress", server_default="in_progress")
    question_count: Mapped[int] = mapped_column(SmallInteger, default=0, server_default="0")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    deadline_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Essays (USAT full mock + essay practice)
    essay_status: Mapped[str] = mapped_column(String(12), default="none", server_default="none")
    essay_options: Mapped[dict | None] = mapped_column(JSONB)
    essay_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    essay_deadline_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    essay_submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "mode IN ('topic','subject','section','full_mock','essay')", name="mode_valid"
        ),
        CheckConstraint("status IN ('in_progress','submitted')", name="status_valid"),
        CheckConstraint(
            "essay_status IN ('none','pending','in_progress','submitted','graded')",
            name="essay_status_valid",
        ),
        Index("ix_attempts_user_created", "user_id", text("created_at DESC")),
        # D16: at most one active full mock per student per category.
        Index(
            "uq_attempts_active_full_mock",
            "user_id",
            "category_id",
            unique=True,
            postgresql_where=text("status = 'in_progress' AND mode = 'full_mock'"),
        ),
    )


class AttemptQuestion(Base):
    """One row per question in an attempt; also stores the student's answer."""

    __tablename__ = "attempt_questions"

    attempt_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("attempts.id", ondelete="CASCADE"), primary_key=True
    )
    position: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    question_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("questions.id", ondelete="RESTRICT"), index=True
    )
    section_id: Mapped[int] = mapped_column(ForeignKey("sections.id", ondelete="RESTRICT"))
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="RESTRICT"))
    selected_option: Mapped[str | None] = mapped_column(String(1))
    is_marked: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    is_checked: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    client_seq: Mapped[int] = mapped_column(BigInteger, default=0, server_default="0")
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_correct: Mapped[bool | None] = mapped_column(Boolean)

    __table_args__ = (
        CheckConstraint(
            "selected_option IS NULL OR selected_option IN ('A','B','C','D')",
            name="selected_option_valid",
        ),
    )


class Result(Base):
    """Persisted score. attempt_id as PK makes result creation idempotent."""

    __tablename__ = "results"

    attempt_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("attempts.id", ondelete="CASCADE"), primary_key=True
    )
    score: Mapped[int] = mapped_column(Integer)
    total_marks: Mapped[int] = mapped_column(Integer)
    correct: Mapped[int] = mapped_column(SmallInteger)
    incorrect: Mapped[int] = mapped_column(SmallInteger)
    unanswered: Mapped[int] = mapped_column(SmallInteger)
    accuracy: Mapped[float] = mapped_column(Float)
    time_used_sec: Mapped[int] = mapped_column(Integer)
    section_breakdown: Mapped[list] = mapped_column(JSONB)
    subject_breakdown: Mapped[list] = mapped_column(JSONB)
    essay_score: Mapped[int | None] = mapped_column(SmallInteger)
    essay_total: Mapped[int | None] = mapped_column(SmallInteger)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class EssaySubmission(Base):
    __tablename__ = "essay_submissions"

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("attempts.id", ondelete="CASCADE")
    )
    essay_type: Mapped[str] = mapped_column(String(12))
    essay_topic_id: Mapped[int | None] = mapped_column(
        ForeignKey("essay_topics.id", ondelete="SET NULL")
    )
    content: Mapped[str] = mapped_column(Text, default="", server_default="")
    word_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    status: Mapped[str] = mapped_column(String(12), default="draft", server_default="draft")
    max_score: Mapped[int] = mapped_column(SmallInteger)
    score: Mapped[int | None] = mapped_column(SmallInteger)
    feedback: Mapped[str | None] = mapped_column(Text)
    graded_by: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL")
    )
    graded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    client_seq: Mapped[int] = mapped_column(BigInteger, default=0, server_default="0")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint("attempt_id", "essay_type", name="uq_essay_submissions_attempt_type"),
        CheckConstraint("essay_type IN ('argument','narrative')", name="essay_type_valid"),
        CheckConstraint("status IN ('draft','submitted','graded')", name="status_valid"),
        CheckConstraint("score IS NULL OR (score >= 0 AND score <= max_score)", name="score_range"),
        Index("ix_essay_submissions_status", "status", "updated_at"),
    )
