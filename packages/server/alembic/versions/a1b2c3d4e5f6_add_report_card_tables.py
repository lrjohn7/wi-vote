"""add partisan_lean column and election_aggregations table

Revision ID: a1b2c3d4e5f6
Revises: c03cfcc18a5b
Create Date: 2026-02-27 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'c03cfcc18a5b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add partisan_lean column to wards table
    op.add_column('wards', sa.Column('partisan_lean', sa.Float(), nullable=True))

    # Create election_aggregations table
    op.create_table('election_aggregations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('aggregation_level', sa.String(length=20), nullable=False),
        sa.Column('aggregation_key', sa.String(length=100), nullable=False),
        sa.Column('election_year', sa.Integer(), nullable=False),
        sa.Column('race_type', sa.String(length=50), nullable=False),
        sa.Column('dem_votes', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('rep_votes', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('other_votes', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_votes', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('dem_pct', sa.Float(), nullable=True),
        sa.Column('rep_pct', sa.Float(), nullable=True),
        sa.Column('margin', sa.Float(), nullable=True),
        sa.Column('ward_count', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint(
            'aggregation_level', 'aggregation_key', 'election_year', 'race_type',
            name='uq_aggregation_unique',
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('election_aggregations')
    op.drop_column('wards', 'partisan_lean')
