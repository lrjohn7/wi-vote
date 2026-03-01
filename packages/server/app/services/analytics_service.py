from datetime import datetime, timedelta

from sqlalchemy import func, select, cast, Date, distinct, case, extract
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics_event import AnalyticsEvent


VALID_EVENT_TYPES = {"pageview", "heartbeat", "interaction", "unload"}
VALID_DEVICE_TYPES = {"mobile", "tablet", "desktop"}


class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def ingest_events(self, events: list[dict]) -> int:
        count = 0
        for ev in events:
            if ev.get("event_type") not in VALID_EVENT_TYPES:
                continue
            if ev.get("device_type") not in VALID_DEVICE_TYPES:
                continue

            record = AnalyticsEvent(
                session_id=str(ev.get("session_id", ""))[:36],
                event_type=ev["event_type"],
                page_path=str(ev.get("page_path", "/"))[:500],
                referrer=str(ev.get("referrer", ""))[:500] if ev.get("referrer") else None,
                device_type=ev["device_type"],
                screen_width=ev.get("screen_width"),
                metadata_json=ev.get("metadata"),
            )
            self.db.add(record)
            count += 1

        if count > 0:
            await self.db.commit()
        return count

    async def get_dashboard_data(self, days: int = 30) -> dict:
        cutoff = datetime.utcnow() - timedelta(days=days)

        visitors_by_day = await self._visitors_by_day(cutoff)
        top_pages = await self._top_pages(cutoff)
        avg_duration = await self._avg_session_duration(cutoff)
        device_breakdown = await self._device_breakdown(cutoff)
        totals = await self._totals(cutoff)

        return {
            "visitors_by_day": visitors_by_day,
            "top_pages": top_pages,
            "avg_session_seconds": avg_duration,
            "device_breakdown": device_breakdown,
            "totals": totals,
        }

    async def _visitors_by_day(self, cutoff: datetime) -> list[dict]:
        day = cast(AnalyticsEvent.created_at, Date)
        stmt = (
            select(
                day.label("date"),
                func.count(distinct(AnalyticsEvent.session_id)).label("sessions"),
                func.count()
                .filter(AnalyticsEvent.event_type == "pageview")
                .label("pageviews"),
            )
            .where(AnalyticsEvent.created_at >= cutoff)
            .group_by(day)
            .order_by(day)
        )
        result = await self.db.execute(stmt)
        return [
            {
                "date": str(row.date),
                "sessions": row.sessions,
                "pageviews": row.pageviews,
            }
            for row in result.all()
        ]

    async def _top_pages(self, cutoff: datetime) -> list[dict]:
        stmt = (
            select(
                AnalyticsEvent.page_path.label("path"),
                func.count()
                .filter(AnalyticsEvent.event_type == "pageview")
                .label("views"),
                func.count(distinct(AnalyticsEvent.session_id)).label("sessions"),
            )
            .where(AnalyticsEvent.created_at >= cutoff)
            .group_by(AnalyticsEvent.page_path)
            .order_by(func.count().desc())
            .limit(15)
        )
        result = await self.db.execute(stmt)
        return [
            {"path": row.path, "views": row.views, "sessions": row.sessions}
            for row in result.all()
        ]

    async def _avg_session_duration(self, cutoff: datetime) -> float:
        # Duration per session = MAX(created_at) - MIN(created_at)
        subq = (
            select(
                AnalyticsEvent.session_id,
                (
                    extract("epoch", func.max(AnalyticsEvent.created_at))
                    - extract("epoch", func.min(AnalyticsEvent.created_at))
                ).label("duration_secs"),
            )
            .where(AnalyticsEvent.created_at >= cutoff)
            .group_by(AnalyticsEvent.session_id)
            .having(func.count() > 1)  # Only sessions with >1 event
            .subquery()
        )
        stmt = select(func.avg(subq.c.duration_secs))
        result = await self.db.execute(stmt)
        avg = result.scalar()
        return round(float(avg), 1) if avg else 0.0

    async def _device_breakdown(self, cutoff: datetime) -> dict:
        stmt = (
            select(
                AnalyticsEvent.device_type,
                func.count(distinct(AnalyticsEvent.session_id)).label("sessions"),
            )
            .where(AnalyticsEvent.created_at >= cutoff)
            .group_by(AnalyticsEvent.device_type)
        )
        result = await self.db.execute(stmt)
        breakdown = {"desktop": 0, "tablet": 0, "mobile": 0}
        for row in result.all():
            if row.device_type in breakdown:
                breakdown[row.device_type] = row.sessions
        return breakdown

    async def _totals(self, cutoff: datetime) -> dict:
        stmt = select(
            func.count()
            .filter(AnalyticsEvent.event_type == "pageview")
            .label("pageviews"),
            func.count(distinct(AnalyticsEvent.session_id)).label("sessions"),
        ).where(AnalyticsEvent.created_at >= cutoff)
        result = await self.db.execute(stmt)
        row = result.one()
        return {"pageviews": row.pageviews, "sessions": row.sessions}
