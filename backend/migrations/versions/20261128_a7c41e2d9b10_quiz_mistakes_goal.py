"""quiz + mistakes attempt modes, daily goal

Revision ID: a7c41e2d9b10
Revises: 3b6e7cc1b1e8
Create Date: 2026-11-28 10:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a7c41e2d9b10"
down_revision: str | None = "3b6e7cc1b1e8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

OLD_MODES = "mode IN ('topic','subject','section','full_mock','essay')"
NEW_MODES = "mode IN ('topic','subject','section','full_mock','essay','quiz','mistakes')"


def upgrade() -> None:
    op.drop_constraint(op.f("ck_attempts_mode_valid"), "attempts", type_="check")
    op.create_check_constraint(op.f("ck_attempts_mode_valid"), "attempts", NEW_MODES)
    op.add_column(
        "users",
        sa.Column("daily_goal", sa.SmallInteger(), server_default="20", nullable=False),
    )
    op.create_check_constraint(op.f("ck_users_daily_goal_range"), "users", "daily_goal BETWEEN 5 AND 200")


def downgrade() -> None:
    op.drop_constraint(op.f("ck_users_daily_goal_range"), "users", type_="check")
    op.drop_column("users", "daily_goal")
    op.execute("DELETE FROM attempts WHERE mode IN ('quiz','mistakes')")
    op.drop_constraint(op.f("ck_attempts_mode_valid"), "attempts", type_="check")
    op.create_check_constraint(op.f("ck_attempts_mode_valid"), "attempts", OLD_MODES)
