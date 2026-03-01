from datetime import datetime

from sqlalchemy import Boolean, Float, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class LiveResult(Base):
    """Stores real-time election night results as they come in."""

    __tablename__ = "live_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    election_date: Mapped[str] = mapped_column(String(10), nullable=False)  # YYYY-MM-DD
    race_type: Mapped[str] = mapped_column(String(50), nullable=False)
    ward_id: Mapped[str] = mapped_column(String(50), nullable=False)
    reporting_unit_name: Mapped[str | None] = mapped_column(String(500))
    dem_votes: Mapped[int] = mapped_column(Integer, default=0)
    rep_votes: Mapped[int] = mapped_column(Integer, default=0)
    other_votes: Mapped[int] = mapped_column(Integer, default=0)
    total_votes: Mapped[int] = mapped_column(Integer, default=0)
    precincts_reporting: Mapped[int] = mapped_column(Integer, default=0)
    precincts_total: Mapped[int] = mapped_column(Integer, default=0)
    pct_reporting: Mapped[float] = mapped_column(Float, default=0.0)
    is_final: Mapped[bool] = mapped_column(Boolean, default=False)
    last_updated: Mapped[datetime] = mapped_column(default=datetime.now, onupdate=datetime.now)
    created_at: Mapped[datetime] = mapped_column(default=datetime.now)

    __table_args__ = (
        Index("idx_live_results_election", "election_date", "race_type"),
        Index("idx_live_results_ward", "ward_id"),
    )


class LiveElection(Base):
    """Tracks active election night sessions."""

    __tablename__ = "live_elections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    election_date: Mapped[str] = mapped_column(String(10), nullable=False, unique=True)
    election_name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    total_wards: Mapped[int] = mapped_column(Integer, default=0)
    wards_reporting: Mapped[int] = mapped_column(Integer, default=0)
    last_updated: Mapped[datetime] = mapped_column(default=datetime.now, onupdate=datetime.now)
    created_at: Mapped[datetime] = mapped_column(default=datetime.now)
