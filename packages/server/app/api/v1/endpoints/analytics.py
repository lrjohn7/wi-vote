from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.services.analytics_service import AnalyticsService


router = APIRouter(prefix="/analytics", tags=["analytics"])


class AnalyticsEventItem(BaseModel):
    session_id: str = Field(max_length=36)
    event_type: str = Field(max_length=20)
    page_path: str = Field(max_length=500)
    referrer: str | None = Field(default=None, max_length=500)
    device_type: str = Field(max_length=20)
    screen_width: int | None = None
    metadata: dict[str, Any] | None = None


class AnalyticsEventBatch(BaseModel):
    events: list[AnalyticsEventItem] = Field(max_length=100)


@router.post("/events", status_code=202)
async def ingest_events(
    batch: AnalyticsEventBatch,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Ingest a batch of analytics events. No auth required."""
    service = AnalyticsService(db)
    count = await service.ingest_events([e.model_dump() for e in batch.events])
    return {"ok": True, "count": count}


@router.get("/dashboard")
async def get_dashboard(
    key: str = Query(..., description="Admin analytics key"),
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get aggregated analytics dashboard data. Requires admin key."""
    if not settings.admin_analytics_key or key != settings.admin_analytics_key:
        raise HTTPException(status_code=403, detail="Invalid analytics key")

    service = AnalyticsService(db)
    return await service.get_dashboard_data(days)
