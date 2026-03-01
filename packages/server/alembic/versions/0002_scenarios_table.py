"""add scenarios table

Revision ID: 0002
Revises: 0001
Create Date: 2026-02-28 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: Union[str, Sequence[str], None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "scenarios",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("short_id", sa.String(length=16), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("model_id", sa.String(length=50), nullable=False),
        sa.Column("parameters", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("short_id", name="uq_scenario_short_id"),
    )
    op.create_index("idx_scenarios_short_id", "scenarios", ["short_id"])
    op.create_index("idx_scenarios_created_at", "scenarios", ["created_at"])


def downgrade() -> None:
    op.drop_index("idx_scenarios_created_at", table_name="scenarios")
    op.drop_index("idx_scenarios_short_id", table_name="scenarios")
    op.drop_table("scenarios")
