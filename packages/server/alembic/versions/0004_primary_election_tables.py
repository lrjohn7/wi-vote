"""add primary_reporting_units and primary_results tables

Revision ID: 0004
Revises: 0003
Create Date: 2026-03-01 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY
from geoalchemy2 import Geometry


# revision identifiers, used by Alembic.
revision: str = "0004"
down_revision: Union[str, Sequence[str], None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -- primary_reporting_units --
    op.create_table(
        "primary_reporting_units",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ru_id", sa.String(length=100), nullable=False),
        sa.Column("ru_name", sa.String(length=500), nullable=False),
        sa.Column("county", sa.String(length=100), nullable=False),
        sa.Column(
            "constituent_ward_ids",
            ARRAY(sa.String()),
            nullable=True,
        ),
        sa.Column("n_constituent_wards", sa.Integer(), nullable=True, server_default="1"),
        sa.Column("ward_vintage", sa.Integer(), nullable=False, server_default="2020"),
        sa.Column(
            "geom",
            Geometry(geometry_type="MULTIPOLYGON", srid=4326),
            nullable=True,
        ),
        sa.Column("area_sq_miles", sa.Float(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=True,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ru_id", name="uq_primary_ru_id"),
    )
    op.create_index(
        "idx_primary_ru_geom",
        "primary_reporting_units",
        ["geom"],
        postgresql_using="gist",
    )
    op.create_index(
        "idx_primary_ru_county", "primary_reporting_units", ["county"]
    )
    op.create_index(
        "idx_primary_ru_vintage", "primary_reporting_units", ["ward_vintage"]
    )

    # -- primary_results --
    op.create_table(
        "primary_results",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ru_id", sa.String(length=100), nullable=False),
        sa.Column("election_year", sa.Integer(), nullable=False),
        sa.Column("election_date", sa.Date(), nullable=True),
        sa.Column(
            "race_type",
            sa.String(length=50),
            nullable=False,
            server_default="governor",
        ),
        sa.Column(
            "party",
            sa.String(length=10),
            nullable=False,
            server_default="DEM",
        ),
        sa.Column("candidate", sa.String(length=255), nullable=False),
        sa.Column("votes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_votes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("vote_pct", sa.Float(), nullable=True),
        sa.Column(
            "data_source",
            sa.String(length=100),
            nullable=True,
            server_default="openelections",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=True,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["ru_id"],
            ["primary_reporting_units.ru_id"],
            name="fk_primary_results_ru",
        ),
        sa.UniqueConstraint(
            "ru_id",
            "election_year",
            "race_type",
            "candidate",
            name="uq_primary_result",
        ),
    )
    op.create_index(
        "idx_primary_results_year",
        "primary_results",
        ["election_year", "race_type"],
    )
    op.create_index(
        "idx_primary_results_ru", "primary_results", ["ru_id"]
    )


def downgrade() -> None:
    op.drop_index("idx_primary_results_ru", table_name="primary_results")
    op.drop_index("idx_primary_results_year", table_name="primary_results")
    op.drop_table("primary_results")

    op.drop_index("idx_primary_ru_vintage", table_name="primary_reporting_units")
    op.drop_index("idx_primary_ru_county", table_name="primary_reporting_units")
    op.drop_index("idx_primary_ru_geom", table_name="primary_reporting_units")
    op.drop_table("primary_reporting_units")
