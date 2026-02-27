from datetime import date, datetime

from sqlalchemy import Integer, String, Date, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SpringElectionResult(Base):
    __tablename__ = "spring_election_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    county: Mapped[str] = mapped_column(String(100), nullable=False)
    reporting_unit: Mapped[str] = mapped_column(String(500), nullable=False)
    election_year: Mapped[int] = mapped_column(Integer, nullable=False)
    election_date: Mapped[date | None] = mapped_column(Date)
    contest_name: Mapped[str] = mapped_column(String(255), nullable=False)
    candidate_1_name: Mapped[str] = mapped_column(String(255), nullable=False)
    candidate_1_votes: Mapped[int] = mapped_column(Integer, default=0)
    candidate_2_name: Mapped[str] = mapped_column(String(255), nullable=False)
    candidate_2_votes: Mapped[int] = mapped_column(Integer, default=0)
    scattering_votes: Mapped[int] = mapped_column(Integer, default=0)
    total_votes: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(default=datetime.now)

    @property
    def candidate_1_pct(self) -> float:
        if self.total_votes == 0:
            return 0.0
        return self.candidate_1_votes / self.total_votes * 100

    @property
    def candidate_2_pct(self) -> float:
        if self.total_votes == 0:
            return 0.0
        return self.candidate_2_votes / self.total_votes * 100

    @property
    def margin(self) -> float:
        """Positive = candidate_1 leads, negative = candidate_2 leads."""
        if self.total_votes == 0:
            return 0.0
        return (self.candidate_1_votes - self.candidate_2_votes) / self.total_votes * 100

    __table_args__ = (
        Index("idx_spring_county", "county"),
        Index("idx_spring_year", "election_year"),
        UniqueConstraint(
            "county", "reporting_unit", "election_year", "contest_name",
            name="idx_spring_unique",
        ),
    )
