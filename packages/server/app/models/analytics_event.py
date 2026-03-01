from datetime import datetime

from sqlalchemy import Index, Integer, JSON, String, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[str] = mapped_column(String(36), nullable=False)
    event_type: Mapped[str] = mapped_column(String(20), nullable=False)
    page_path: Mapped[str] = mapped_column(String(500), nullable=False)
    referrer: Mapped[str | None] = mapped_column(String(500))
    device_type: Mapped[str] = mapped_column(String(20), nullable=False)
    screen_width: Mapped[int | None] = mapped_column(Integer)
    metadata_json: Mapped[dict | None] = mapped_column("metadata", JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    __table_args__ = (
        Index("idx_analytics_created_at", "created_at"),
        Index("idx_analytics_session_id", "session_id"),
        Index("idx_analytics_page_path", "page_path"),
    )
