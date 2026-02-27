from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class WardDemographic(Base):
    __tablename__ = "ward_demographics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ward_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    census_year: Mapped[int | None] = mapped_column(Integer)
    total_population: Mapped[int | None] = mapped_column(Integer)
    voting_age_population: Mapped[int | None] = mapped_column(Integer)
    white_pct: Mapped[float | None] = mapped_column(Float)
    black_pct: Mapped[float | None] = mapped_column(Float)
    hispanic_pct: Mapped[float | None] = mapped_column(Float)
    asian_pct: Mapped[float | None] = mapped_column(Float)
    college_degree_pct: Mapped[float | None] = mapped_column(Float)
    median_household_income: Mapped[int | None] = mapped_column(Integer)
    urban_rural_class: Mapped[str | None] = mapped_column(String(20))
    population_density: Mapped[float | None] = mapped_column(Float)
    ward_vintage: Mapped[int] = mapped_column(Integer, nullable=False)
    data_source: Mapped[str | None] = mapped_column(String(100))
