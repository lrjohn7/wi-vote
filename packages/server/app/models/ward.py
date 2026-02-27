from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, Float, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Ward(Base):
    __tablename__ = "wards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ward_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    ward_name: Mapped[str] = mapped_column(String(255), nullable=False)
    municipality: Mapped[str] = mapped_column(String(255), nullable=False)
    municipality_type: Mapped[str | None] = mapped_column(String(20))
    county: Mapped[str] = mapped_column(String(100), nullable=False)
    congressional_district: Mapped[str | None] = mapped_column(String(10))
    state_senate_district: Mapped[str | None] = mapped_column(String(10))
    assembly_district: Mapped[str | None] = mapped_column(String(10))
    county_supervisory_district: Mapped[str | None] = mapped_column(String(10))
    ward_vintage: Mapped[int] = mapped_column(Integer, nullable=False)
    geom: Mapped[str] = mapped_column(
        Geometry("MULTIPOLYGON", srid=4326), nullable=False
    )
    area_sq_miles: Mapped[float | None] = mapped_column(Float)
    partisan_lean: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_estimated: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.now, onupdate=datetime.now
    )

    election_results: Mapped[list["ElectionResult"]] = relationship(
        "ElectionResult", back_populates="ward", lazy="select"
    )

    __table_args__ = (
        Index("idx_wards_geom", "geom", postgresql_using="gist"),
        Index("idx_wards_vintage", "ward_vintage"),
        Index("idx_wards_county", "county"),
        Index("idx_wards_municipality", "municipality"),
    )


from app.models.election_result import ElectionResult  # noqa: E402
