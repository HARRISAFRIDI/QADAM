"""Memorize (flashcard decks + spaced repetition) and personal study plans."""

import uuid
from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Identity,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base, TimestampMixin
from utils.ids import uuid7

DECK_KINDS = ("vocabulary", "formula", "fact")
PLAN_TASK_KINDS = (
    "practice_subject",
    "practice_section",
    "quiz",
    "mock",
    "mistakes",
    "memorize",
    "essay",
)


class Deck(Base, TimestampMixin):
    """A set of flashcards. exam_id / subject_id NULL = shown to every test / category."""

    __tablename__ = "decks"

    id: Mapped[int] = mapped_column(Integer, Identity(), primary_key=True)
    exam_id: Mapped[int | None] = mapped_column(ForeignKey("exams.id", ondelete="SET NULL"))
    subject_id: Mapped[int | None] = mapped_column(ForeignKey("subjects.id", ondelete="SET NULL"))
    kind: Mapped[str] = mapped_column(String(12))
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(12), default="draft", server_default="draft")
    sort_order: Mapped[int] = mapped_column(SmallInteger, default=0, server_default="0")
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL")
    )

    __table_args__ = (
        CheckConstraint("kind IN ('vocabulary','formula','fact')", name="kind_valid"),
        CheckConstraint("status IN ('draft','published')", name="status_valid"),
        Index("ix_decks_status", "status", "exam_id"),
    )


class Card(Base):
    __tablename__ = "cards"

    id: Mapped[int] = mapped_column(Integer, Identity(), primary_key=True)
    deck_id: Mapped[int] = mapped_column(ForeignKey("decks.id", ondelete="CASCADE"), index=True)
    front: Mapped[str] = mapped_column(Text)
    back: Mapped[str] = mapped_column(Text)
    example: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CardReview(Base):
    """One student's spaced-repetition state for one card (SM-2 style)."""

    __tablename__ = "card_reviews"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    card_id: Mapped[int] = mapped_column(
        ForeignKey("cards.id", ondelete="CASCADE"), primary_key=True
    )
    ease: Mapped[float] = mapped_column(Float, default=2.5, server_default="2.5")
    interval_days: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    reps: Mapped[int] = mapped_column(SmallInteger, default=0, server_default="0")
    lapses: Mapped[int] = mapped_column(SmallInteger, default=0, server_default="0")
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    __table_args__ = (Index("ix_card_reviews_user_due", "user_id", "due_at"),)


class StudyPlan(Base):
    __tablename__ = "study_plans"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid7)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"))
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="CASCADE"))
    kind: Mapped[str] = mapped_column(String(8))  # '30', '14', 'custom'
    start_date: Mapped[date] = mapped_column(Date)
    days: Mapped[int] = mapped_column(SmallInteger)
    exam_date: Mapped[date | None] = mapped_column(Date)
    daily_minutes: Mapped[int] = mapped_column(SmallInteger)
    status: Mapped[str] = mapped_column(String(10), default="active", server_default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint("kind IN ('30','14','custom')", name="kind_valid"),
        CheckConstraint("status IN ('active','archived')", name="status_valid"),
        CheckConstraint("days BETWEEN 7 AND 120", name="days_range"),
        # One active plan per student.
        Index(
            "uq_study_plans_active",
            "user_id",
            unique=True,
            postgresql_where=text("status = 'active'"),
        ),
    )


class StudyPlanTask(Base):
    __tablename__ = "study_plan_tasks"

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    plan_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("study_plans.id", ondelete="CASCADE")
    )
    day: Mapped[int] = mapped_column(SmallInteger)
    position: Mapped[int] = mapped_column(SmallInteger)
    kind: Mapped[str] = mapped_column(String(20))
    title: Mapped[str] = mapped_column(String(200))
    ref_id: Mapped[int | None] = mapped_column(Integer)
    count: Mapped[int | None] = mapped_column(SmallInteger)
    minutes: Mapped[int] = mapped_column(SmallInteger)
    attempt_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("attempts.id", ondelete="SET NULL")
    )
    done_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint(
            "kind IN ('practice_subject','practice_section','quiz','mock','mistakes','memorize','essay')",
            name="kind_valid",
        ),
        Index("ix_study_plan_tasks_plan_day", "plan_id", "day", "position"),
    )
