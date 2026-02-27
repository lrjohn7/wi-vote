from datetime import datetime

from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class WardTrend(Base):
    __tablename__ = "ward_trends"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ward_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    race_type: Mapped[str] = mapped_column(String(50), nullable=False)
    trend_direction: Mapped[str | None] = mapped_column(String(20))
    trend_slope: Mapped[float | None] = mapped_column(Float)
    trend_r_squared: Mapped[float | None] = mapped_column(Float)
    trend_p_value: Mapped[float | None] = mapped_column(Float)
    elections_analyzed: Mapped[int | None] = mapped_column(Integer)
    start_year: Mapped[int | None] = mapped_column(Integer)
    end_year: Mapped[int | None] = mapped_column(Integer)
    ward_vintage: Mapped[int] = mapped_column(Integer, nullable=False)
    computed_at: Mapped[datetime] = mapped_column(default=datetime.now)
