"""Content hierarchy: Exam -> Category -> (Section x Subject via Blueprint) -> Topic."""

from sqlalchemy import (
    ARRAY,
    Boolean,
    CheckConstraint,
    ForeignKey,
    Identity,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base, TimestampMixin


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[int] = mapped_column(SmallInteger, Identity(), primary_key=True)
    code: Mapped[str] = mapped_column(String(16), unique=True)  # HAT | USAT
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(SmallInteger, default=0, server_default="0")


class Category(Base, TimestampMixin):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(SmallInteger, Identity(), primary_key=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id", ondelete="RESTRICT"), index=True)
    code: Mapped[str] = mapped_column(String(24), unique=True)  # HAT-I, USAT-E ...
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text)
    disciplines: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list, server_default="{}")
    mcq_duration_min: Mapped[int] = mapped_column(SmallInteger)
    essay_duration_min: Mapped[int | None] = mapped_column(SmallInteger)
    sort_order: Mapped[int] = mapped_column(SmallInteger, default=0, server_default="0")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    __table_args__ = (CheckConstraint("mcq_duration_min > 0", name="mcq_duration_positive"),)


class Section(Base):
    __tablename__ = "sections"

    id: Mapped[int] = mapped_column(SmallInteger, Identity(), primary_key=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id", ondelete="RESTRICT"))
    code: Mapped[str] = mapped_column(String(32))
    name: Mapped[str] = mapped_column(String(120))
    kind: Mapped[str] = mapped_column(String(8), default="mcq", server_default="mcq")
    sort_order: Mapped[int] = mapped_column(SmallInteger, default=0, server_default="0")

    __table_args__ = (
        UniqueConstraint("exam_id", "code", name="uq_sections_exam_code"),
        CheckConstraint("kind IN ('mcq','essay')", name="kind_valid"),
    )


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(SmallInteger, Identity(), primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    sort_order: Mapped[int] = mapped_column(SmallInteger, default=0, server_default="0")


class Topic(Base, TimestampMixin):
    __tablename__ = "topics"

    id: Mapped[int] = mapped_column(Integer, Identity(), primary_key=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"))
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("topics.id", ondelete="SET NULL"))
    name: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(140))
    sort_order: Mapped[int] = mapped_column(SmallInteger, default=0, server_default="0")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    __table_args__ = (UniqueConstraint("subject_id", "slug", name="uq_topics_subject_slug"),)


class Blueprint(Base):
    """Weightage: how many MCQs of a subject appear in a category's full mock."""

    __tablename__ = "blueprints"

    id: Mapped[int] = mapped_column(Integer, Identity(), primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="CASCADE"))
    section_id: Mapped[int] = mapped_column(ForeignKey("sections.id", ondelete="RESTRICT"))
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="RESTRICT"))
    mcq_count: Mapped[int] = mapped_column(SmallInteger)
    sort_order: Mapped[int] = mapped_column(SmallInteger, default=0, server_default="0")

    __table_args__ = (
        UniqueConstraint("category_id", "subject_id", name="uq_blueprints_category_subject"),
        CheckConstraint("mcq_count > 0", name="mcq_count_positive"),
    )
