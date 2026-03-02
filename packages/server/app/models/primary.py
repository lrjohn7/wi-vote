from datetime import date, datetime

from geoalchemy2 import Geometry
from sqlalchemy import (
    Date,
    Float,
    ForeignKeyConstraint,
    Integer,
    String,
    UniqueConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class PrimaryReportingUnit(Base):
    """Reporting unit geometries for primary elections.

    Primary elections report results at the reporting-unit level, which may
    correspond to a single ward or a combination of wards.  This table stores
    the (optionally merged) geometry for each reporting unit, along with the
    list of constituent ward GEOIDs.
    """

    __tablename__ = "primary_reporting_units"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ru_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    ru_name: Mapped[str] = mapped_column(String(500), nullable=False)
    county: Mapped[str] = mapped_column(String(100), nullable=False)
    constituent_ward_ids: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True
    )
    n_constituent_wards: Mapped[int] = mapped_column(Integer, default=1)
    ward_vintage: Mapped[int] = mapped_column(Integer, nullable=False, default=2020)
    geom: Mapped[str | None] = mapped_column(
        Geometry("MULTIPOLYGON", srid=4326), nullable=True
    )
    area_sq_miles: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(default=datetime.now)

    results: Mapped[list["PrimaryResult"]] = relationship(
        "PrimaryResult", back_populates="reporting_unit", lazy="select"
    )

    __table_args__ = (
        Index("idx_primary_ru_geom", "geom", postgresql_using="gist"),
        Index("idx_primary_ru_county", "county"),
        Index("idx_primary_ru_vintage", "ward_vintage"),
    )


class PrimaryResult(Base):
    """Per-candidate results for a primary election reporting unit.

    Each row stores one candidate's vote total for a single reporting unit
    in a given primary election year and race.
    """

    __tablename__ = "primary_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ru_id: Mapped[str] = mapped_column(String(100), nullable=False)
    election_year: Mapped[int] = mapped_column(Integer, nullable=False)
    election_date: Mapped[date | None] = mapped_column(Date)
    race_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="governor"
    )
    party: Mapped[str] = mapped_column(String(10), nullable=False, default="DEM")
    candidate: Mapped[str] = mapped_column(String(255), nullable=False)
    votes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_votes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    vote_pct: Mapped[float | None] = mapped_column(Float)
    data_source: Mapped[str | None] = mapped_column(
        String(100), default="openelections"
    )
    created_at: Mapped[datetime] = mapped_column(default=datetime.now)

    reporting_unit: Mapped["PrimaryReportingUnit"] = relationship(
        "PrimaryReportingUnit", back_populates="results"
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ["ru_id"],
            ["primary_reporting_units.ru_id"],
            name="fk_primary_results_ru",
        ),
        Index("idx_primary_results_year", "election_year", "race_type"),
        Index("idx_primary_results_ru", "ru_id"),
        UniqueConstraint(
            "ru_id",
            "election_year",
            "race_type",
            "candidate",
            name="uq_primary_result",
        ),
    )
