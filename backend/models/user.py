import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base, TimestampMixin
from utils.ids import uuid7


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid7)
    email: Mapped[str] = mapped_column(String(254), unique=True)  # stored lower-case
    password_hash: Mapped[str] = mapped_column(String(100))
    full_name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(30))
    city: Mapped[str | None] = mapped_column(String(80))
    role: Mapped[str] = mapped_column(String(16), default="student", server_default="student")
    target_exam_id: Mapped[int | None] = mapped_column(ForeignKey("exams.id", ondelete="SET NULL"))
    preferred_category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL")
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    token_version: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (CheckConstraint("role IN ('student','admin')", name="role_valid"),)
