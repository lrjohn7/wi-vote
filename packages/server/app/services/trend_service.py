from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ward_trend import WardTrend
from app.models.election_result import ElectionResult
from app.models.ward import Ward


class TrendService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_ward_trend(self, ward_id: str) -> dict | None:
        """Returns trend data + election history for time series."""
        # Get all trends for this ward
        trend_stmt = select(WardTrend).where(WardTrend.ward_id == ward_id)
        trend_result = await self.db.execute(trend_stmt)
        trends = trend_result.scalars().all()

        if not trends:
            # No pre-computed trends — still return election history
            pass

        # Get election history for time series chart
        election_stmt = (
            select(ElectionResult)
            .where(ElectionResult.ward_id == ward_id)
            .order_by(ElectionResult.election_year)
        )
        election_result = await self.db.execute(election_stmt)
        elections = election_result.scalars().all()

        return {
            "ward_id": ward_id,
            "trends": [
                {
                    "race_type": t.race_type,
                    "direction": t.trend_direction,
                    "slope": t.trend_slope,
                    "r_squared": t.trend_r_squared,
                    "p_value": t.trend_p_value,
                    "elections_analyzed": t.elections_analyzed,
                    "start_year": t.start_year,
                    "end_year": t.end_year,
                }
                for t in trends
            ],
            "elections": [
                {
                    "year": e.election_year,
                    "race_type": e.race_type,
                    "dem_votes": e.dem_votes,
                    "rep_votes": e.rep_votes,
                    "other_votes": e.other_votes,
                    "total_votes": e.total_votes,
                    "dem_pct": e.dem_pct,
                    "rep_pct": e.rep_pct,
                    "margin": e.margin,
                    "is_estimate": e.is_estimate,
                }
                for e in elections
            ],
        }

    async def get_area_trends(
        self,
        county: str | None = None,
        municipality: str | None = None,
        district_type: str | None = None,
        district_id: str | None = None,
    ) -> dict:
        """Filtered ward trends with direction summary counts."""
        # Build filter by joining ward_trends with wards
        stmt = (
            select(WardTrend)
            .join(
                Ward,
                (Ward.ward_id == WardTrend.ward_id)
                & (Ward.ward_vintage == WardTrend.ward_vintage),
            )
        )

        if county:
            stmt = stmt.where(Ward.county == county)
        if municipality:
            stmt = stmt.where(Ward.municipality == municipality)
        if district_type and district_id:
            column_map = {
                "congressional": Ward.congressional_district,
                "state_senate": Ward.state_senate_district,
                "assembly": Ward.assembly_district,
            }
            col = column_map.get(district_type)
            if col is not None:
                stmt = stmt.where(col == district_id)

        result = await self.db.execute(stmt)
        trends = result.scalars().all()

        # Compute direction counts
        direction_counts = {"more_democratic": 0, "more_republican": 0, "inconclusive": 0}
        ward_trends = []
        for t in trends:
            if t.trend_direction in direction_counts:
                direction_counts[t.trend_direction] += 1
            ward_trends.append({
                "ward_id": t.ward_id,
                "race_type": t.race_type,
                "direction": t.trend_direction,
                "slope": t.trend_slope,
                "r_squared": t.trend_r_squared,
                "p_value": t.trend_p_value,
            })

        return {
            "summary": direction_counts,
            "total_wards": len(trends),
            "trends": ward_trends,
        }

    async def get_bulk_elections(self, ward_ids: list[str]) -> dict[str, list[dict]]:
        """Get election histories for a list of ward IDs."""
        if not ward_ids:
            return {}

        stmt = (
            select(ElectionResult)
            .where(ElectionResult.ward_id.in_(ward_ids))
            .order_by(ElectionResult.ward_id, ElectionResult.election_year)
        )

        result = await self.db.execute(stmt)
        elections = result.scalars().all()

        grouped: dict[str, list[dict]] = {}
        for e in elections:
            if e.ward_id not in grouped:
                grouped[e.ward_id] = []
            grouped[e.ward_id].append({
                "year": e.election_year,
                "race_type": e.race_type,
                "dem_votes": e.dem_votes,
                "rep_votes": e.rep_votes,
                "other_votes": e.other_votes,
                "total_votes": e.total_votes,
                "dem_pct": e.dem_pct,
                "rep_pct": e.rep_pct,
                "margin": e.margin,
                "is_estimate": e.is_estimate,
            })

        return grouped

    async def classify_all(self, race_type: str = "president") -> dict:
        """Compact {wardId: {direction, slope, stats}} map for map rendering."""
        stmt = select(
            WardTrend.ward_id,
            WardTrend.trend_direction,
            WardTrend.trend_slope,
            WardTrend.trend_p_value,
            WardTrend.trend_r_squared,
            WardTrend.elections_analyzed,
            WardTrend.start_year,
            WardTrend.end_year,
        ).where(WardTrend.race_type == race_type)

        result = await self.db.execute(stmt)
        rows = result.all()

        classifications: dict[str, dict] = {}
        for row in rows:
            classifications[row.ward_id] = {
                "direction": row.trend_direction,
                "slope": row.trend_slope,
                "p_value": row.trend_p_value,
                "r_squared": row.trend_r_squared,
                "elections_analyzed": row.elections_analyzed,
                "start_year": row.start_year,
                "end_year": row.end_year,
            }

        return {"race_type": race_type, "classifications": classifications}
