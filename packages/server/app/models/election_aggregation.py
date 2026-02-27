from datetime import datetime

from sqlalchemy import Float, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ElectionAggregation(Base):
    __tablename__ = "election_aggregations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    aggregation_level: Mapped[str] = mapped_column(String(20), nullable=False)  # 'county' or 'statewide'
    aggregation_key: Mapped[str] = mapped_column(String(100), nullable=False)  # county name or 'WI'
    election_year: Mapped[int] = mapped_column(Integer, nullable=False)
    race_type: Mapped[str] = mapped_column(String(50), nullable=False)
    dem_votes: Mapped[int] = mapped_column(Integer, default=0)
    rep_votes: Mapped[int] = mapped_column(Integer, default=0)
    other_votes: Mapped[int] = mapped_column(Integer, default=0)
    total_votes: Mapped[int] = mapped_column(Integer, default=0)
    dem_pct: Mapped[float | None] = mapped_column(Float)
    rep_pct: Mapped[float | None] = mapped_column(Float)
    margin: Mapped[float | None] = mapped_column(Float)
    ward_count: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(default=datetime.now)

    __table_args__ = (
        UniqueConstraint(
            "aggregation_level", "aggregation_key", "election_year", "race_type",
            name="uq_aggregation_unique",
        ),
    )
