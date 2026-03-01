"""add analytics_events table

Revision ID: 0003
Revises: 0002
Create Date: 2026-03-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0003"
down_revision: Union[str, Sequence[str], None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "analytics_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.String(length=36), nullable=False),
        sa.Column("event_type", sa.String(length=20), nullable=False),
        sa.Column("page_path", sa.String(length=500), nullable=False),
        sa.Column("referrer", sa.String(length=500), nullable=True),
        sa.Column("device_type", sa.String(length=20), nullable=False),
        sa.Column("screen_width", sa.Integer(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_analytics_created_at", "analytics_events", ["created_at"]
    )
    op.create_index(
        "idx_analytics_session_id", "analytics_events", ["session_id"]
    )
    op.create_index(
        "idx_analytics_page_path", "analytics_events", ["page_path"]
    )


def downgrade() -> None:
    op.drop_index("idx_analytics_page_path", table_name="analytics_events")
    op.drop_index("idx_analytics_session_id", table_name="analytics_events")
    op.drop_index("idx_analytics_created_at", table_name="analytics_events")
    op.drop_table("analytics_events")
