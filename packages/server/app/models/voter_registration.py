from datetime import datetime

from sqlalchemy import Float, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class VoterRegistration(Base):
    __tablename__ = "voter_registrations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ward_id: Mapped[str] = mapped_column(String(50), nullable=False)
    snapshot_date: Mapped[str] = mapped_column(String(10), nullable=False)  # YYYY-MM-DD
    total_registered: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    active_registered: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    inactive_registered: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    dem_registered: Mapped[int | None] = mapped_column(Integer)  # WI doesn't have party registration
    rep_registered: Mapped[int | None] = mapped_column(Integer)
    registration_rate: Mapped[float | None] = mapped_column(Float)  # registered / VAP
    ward_vintage: Mapped[int] = mapped_column(Integer, nullable=False, default=2022)
    data_source: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(default=datetime.now)

    __table_args__ = (
        Index("idx_voter_reg_ward_id", "ward_id"),
        Index("idx_voter_reg_snapshot", "snapshot_date"),
        Index("idx_voter_reg_vintage", "ward_vintage"),
    )
