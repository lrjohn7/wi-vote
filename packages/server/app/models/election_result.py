from datetime import date, datetime

from sqlalchemy import Boolean, Integer, String, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ElectionResult(Base):
    __tablename__ = "election_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ward_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    election_year: Mapped[int] = mapped_column(Integer, nullable=False)
    election_date: Mapped[date | None] = mapped_column()
    race_type: Mapped[str] = mapped_column(String(50), nullable=False)
    race_name: Mapped[str | None] = mapped_column(String(255))
    dem_candidate: Mapped[str | None] = mapped_column(String(255))
    rep_candidate: Mapped[str | None] = mapped_column(String(255))
    dem_votes: Mapped[int] = mapped_column(Integer, default=0)
    rep_votes: Mapped[int] = mapped_column(Integer, default=0)
    other_votes: Mapped[int] = mapped_column(Integer, default=0)
    total_votes: Mapped[int] = mapped_column(Integer, default=0)
    is_estimate: Mapped[bool] = mapped_column(Boolean, default=False)
    reporting_unit_name: Mapped[str | None] = mapped_column(String(500))
    data_source: Mapped[str | None] = mapped_column(String(100))
    ward_vintage: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.now)

    @property
    def dem_pct(self) -> float:
        if self.total_votes == 0:
            return 0.0
        return self.dem_votes / self.total_votes * 100

    @property
    def rep_pct(self) -> float:
        if self.total_votes == 0:
            return 0.0
        return self.rep_votes / self.total_votes * 100

    @property
    def margin(self) -> float:
        if self.total_votes == 0:
            return 0.0
        return (self.dem_votes - self.rep_votes) / self.total_votes * 100

    __table_args__ = (
        Index("idx_results_year_race", "election_year", "race_type"),
        Index("idx_results_vintage", "ward_vintage"),
        UniqueConstraint(
            "ward_id", "election_year", "race_type", "ward_vintage",
            name="idx_results_unique",
        ),
    )
