from datetime import datetime

from sqlalchemy import Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class WardNote(Base):
    __tablename__ = "ward_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ward_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    author_name: Mapped[str] = mapped_column(String(100), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str | None] = mapped_column(String(50))  # local_knowledge, correction, context
    is_approved: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.now)

    __table_args__ = (
        Index("idx_ward_notes_ward_id", "ward_id"),
        Index("idx_ward_notes_created_at", "created_at"),
    )
