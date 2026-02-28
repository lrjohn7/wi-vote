"""initial schema — all tables

Revision ID: 0001
Revises:
Create Date: 2026-02-27 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import geoalchemy2
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- wards ---
    op.create_table(
        "wards",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ward_id", sa.String(length=50), nullable=False),
        sa.Column("ward_name", sa.String(length=255), nullable=False),
        sa.Column("municipality", sa.String(length=255), nullable=False),
        sa.Column("municipality_type", sa.String(length=20), nullable=True),
        sa.Column("county", sa.String(length=100), nullable=False),
        sa.Column("congressional_district", sa.String(length=10), nullable=True),
        sa.Column("state_senate_district", sa.String(length=10), nullable=True),
        sa.Column("assembly_district", sa.String(length=10), nullable=True),
        sa.Column("county_supervisory_district", sa.String(length=10), nullable=True),
        sa.Column("ward_vintage", sa.Integer(), nullable=False),
        sa.Column(
            "geom",
            geoalchemy2.types.Geometry(
                geometry_type="MULTIPOLYGON",
                srid=4326,
                from_text="ST_GeomFromEWKT",
                name="geometry",
            ),
            nullable=False,
        ),
        sa.Column("area_sq_miles", sa.Float(), nullable=True),
        sa.Column("partisan_lean", sa.Float(), nullable=True),
        sa.Column("is_estimated", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ward_id"),
    )
    op.create_index("idx_wards_county", "wards", ["county"])
    op.create_index("idx_wards_municipality", "wards", ["municipality"])
    op.create_index("idx_wards_vintage", "wards", ["ward_vintage"])

    # --- election_results ---
    op.create_table(
        "election_results",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ward_id", sa.String(length=50), nullable=False),
        sa.Column("election_year", sa.Integer(), nullable=False),
        sa.Column("election_date", sa.Date(), nullable=True),
        sa.Column("race_type", sa.String(length=50), nullable=False),
        sa.Column("race_name", sa.String(length=255), nullable=True),
        sa.Column("dem_candidate", sa.String(length=255), nullable=True),
        sa.Column("rep_candidate", sa.String(length=255), nullable=True),
        sa.Column("dem_votes", sa.Integer(), nullable=False),
        sa.Column("rep_votes", sa.Integer(), nullable=False),
        sa.Column("other_votes", sa.Integer(), nullable=False),
        sa.Column("total_votes", sa.Integer(), nullable=False),
        sa.Column("is_estimate", sa.Boolean(), nullable=False),
        sa.Column("reporting_unit_name", sa.String(length=500), nullable=True),
        sa.Column("data_source", sa.String(length=100), nullable=True),
        sa.Column("ward_vintage", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["ward_id"], ["wards.ward_id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "ward_id",
            "election_year",
            "race_type",
            "ward_vintage",
            name="idx_results_unique",
        ),
    )
    op.create_index("idx_results_year_race", "election_results", ["election_year", "race_type"])
    op.create_index("idx_results_vintage", "election_results", ["ward_vintage"])
    op.create_index(op.f("ix_election_results_ward_id"), "election_results", ["ward_id"])

    # --- ward_trends ---
    op.create_table(
        "ward_trends",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ward_id", sa.String(length=50), nullable=False),
        sa.Column("race_type", sa.String(length=50), nullable=False),
        sa.Column("trend_direction", sa.String(length=20), nullable=True),
        sa.Column("trend_slope", sa.Float(), nullable=True),
        sa.Column("trend_r_squared", sa.Float(), nullable=True),
        sa.Column("trend_p_value", sa.Float(), nullable=True),
        sa.Column("elections_analyzed", sa.Integer(), nullable=True),
        sa.Column("start_year", sa.Integer(), nullable=True),
        sa.Column("end_year", sa.Integer(), nullable=True),
        sa.Column("ward_vintage", sa.Integer(), nullable=False),
        sa.Column("computed_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ward_trends_ward_id"), "ward_trends", ["ward_id"])

    # --- ward_demographics ---
    op.create_table(
        "ward_demographics",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ward_id", sa.String(length=50), nullable=False),
        sa.Column("census_year", sa.Integer(), nullable=True),
        sa.Column("total_population", sa.Integer(), nullable=True),
        sa.Column("voting_age_population", sa.Integer(), nullable=True),
        sa.Column("white_pct", sa.Float(), nullable=True),
        sa.Column("black_pct", sa.Float(), nullable=True),
        sa.Column("hispanic_pct", sa.Float(), nullable=True),
        sa.Column("asian_pct", sa.Float(), nullable=True),
        sa.Column("college_degree_pct", sa.Float(), nullable=True),
        sa.Column("median_household_income", sa.Integer(), nullable=True),
        sa.Column("urban_rural_class", sa.String(length=20), nullable=True),
        sa.Column("population_density", sa.Float(), nullable=True),
        sa.Column("ward_vintage", sa.Integer(), nullable=False),
        sa.Column("data_source", sa.String(length=100), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ward_demographics_ward_id"), "ward_demographics", ["ward_id"])

    # --- spring_election_results ---
    op.create_table(
        "spring_election_results",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("county", sa.String(length=100), nullable=False),
        sa.Column("reporting_unit", sa.String(length=500), nullable=False),
        sa.Column("election_year", sa.Integer(), nullable=False),
        sa.Column("election_date", sa.Date(), nullable=True),
        sa.Column("contest_name", sa.String(length=255), nullable=False),
        sa.Column("candidate_1_name", sa.String(length=255), nullable=False),
        sa.Column("candidate_1_votes", sa.Integer(), nullable=False),
        sa.Column("candidate_2_name", sa.String(length=255), nullable=False),
        sa.Column("candidate_2_votes", sa.Integer(), nullable=False),
        sa.Column("scattering_votes", sa.Integer(), nullable=False),
        sa.Column("total_votes", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "county",
            "reporting_unit",
            "election_year",
            "contest_name",
            name="idx_spring_unique",
        ),
    )
    op.create_index("idx_spring_county", "spring_election_results", ["county"])
    op.create_index("idx_spring_year", "spring_election_results", ["election_year"])

    # --- election_aggregations ---
    op.create_table(
        "election_aggregations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("aggregation_level", sa.String(length=20), nullable=False),
        sa.Column("aggregation_key", sa.String(length=100), nullable=False),
        sa.Column("election_year", sa.Integer(), nullable=False),
        sa.Column("race_type", sa.String(length=50), nullable=False),
        sa.Column("dem_votes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rep_votes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("other_votes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_votes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("dem_pct", sa.Float(), nullable=True),
        sa.Column("rep_pct", sa.Float(), nullable=True),
        sa.Column("margin", sa.Float(), nullable=True),
        sa.Column("ward_count", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "aggregation_level",
            "aggregation_key",
            "election_year",
            "race_type",
            name="uq_aggregation_unique",
        ),
    )


def downgrade() -> None:
    op.drop_table("election_aggregations")
    op.drop_index("idx_spring_year", table_name="spring_election_results")
    op.drop_index("idx_spring_county", table_name="spring_election_results")
    op.drop_table("spring_election_results")
    op.drop_index(op.f("ix_ward_demographics_ward_id"), table_name="ward_demographics")
    op.drop_table("ward_demographics")
    op.drop_index(op.f("ix_ward_trends_ward_id"), table_name="ward_trends")
    op.drop_table("ward_trends")
    op.drop_index(op.f("ix_election_results_ward_id"), table_name="election_results")
    op.drop_index("idx_results_vintage", table_name="election_results")
    op.drop_index("idx_results_year_race", table_name="election_results")
    op.drop_table("election_results")
    op.drop_index("idx_wards_vintage", table_name="wards")
    op.drop_index("idx_wards_municipality", table_name="wards")
    op.drop_index("idx_wards_county", table_name="wards")
    op.drop_table("wards")
