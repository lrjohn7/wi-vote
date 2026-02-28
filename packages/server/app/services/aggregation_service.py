from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.election_aggregation import ElectionAggregation
from app.models.election_result import ElectionResult
from app.models.ward import Ward


class AggregationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_county(
        self, county: str, year: int, race_type: str
    ) -> dict | None:
        """Get pre-computed county aggregation."""
        stmt = select(ElectionAggregation).where(
            ElectionAggregation.aggregation_level == "county",
            ElectionAggregation.aggregation_key == county,
            ElectionAggregation.election_year == year,
            ElectionAggregation.race_type == race_type,
        )
        result = await self.db.execute(stmt)
        row = result.scalar_one_or_none()
        if not row:
            return None

        return {
            "county": row.aggregation_key,
            "year": row.election_year,
            "race_type": row.race_type,
            "dem_votes": row.dem_votes,
            "rep_votes": row.rep_votes,
            "other_votes": row.other_votes,
            "total_votes": row.total_votes,
            "dem_pct": row.dem_pct,
            "rep_pct": row.rep_pct,
            "margin": row.margin,
            "ward_count": row.ward_count,
        }

    async def get_statewide(self, year: int, race_type: str) -> dict | None:
        """Get pre-computed statewide aggregation."""
        stmt = select(ElectionAggregation).where(
            ElectionAggregation.aggregation_level == "statewide",
            ElectionAggregation.aggregation_key == "WI",
            ElectionAggregation.election_year == year,
            ElectionAggregation.race_type == race_type,
        )
        result = await self.db.execute(stmt)
        row = result.scalar_one_or_none()
        if not row:
            return None

        return {
            "level": "statewide",
            "year": row.election_year,
            "race_type": row.race_type,
            "dem_votes": row.dem_votes,
            "rep_votes": row.rep_votes,
            "other_votes": row.other_votes,
            "total_votes": row.total_votes,
            "dem_pct": row.dem_pct,
            "rep_pct": row.rep_pct,
            "margin": row.margin,
            "ward_count": row.ward_count,
        }

    async def get_district(
        self,
        district_type: str,
        district_id: str,
        year: int,
        race_type: str,
    ) -> dict | None:
        """Live GROUP BY on election_results JOIN wards for district aggregation."""
        # Map district_type to the column on the wards table
        column_map = {
            "congressional": Ward.congressional_district,
            "state_senate": Ward.state_senate_district,
            "assembly": Ward.assembly_district,
        }

        district_col = column_map.get(district_type)
        if district_col is None:
            return None

        stmt = (
            select(
                func.sum(ElectionResult.dem_votes).label("dem_votes"),
                func.sum(ElectionResult.rep_votes).label("rep_votes"),
                func.sum(ElectionResult.other_votes).label("other_votes"),
                func.sum(ElectionResult.total_votes).label("total_votes"),
                func.count(ElectionResult.id).label("ward_count"),
            )
            .join(
                Ward,
                (Ward.ward_id == ElectionResult.ward_id)
                & (Ward.ward_vintage == ElectionResult.ward_vintage),
            )
            .where(
                district_col == district_id,
                ElectionResult.election_year == year,
                ElectionResult.race_type == race_type,
            )
        )

        result = await self.db.execute(stmt)
        row = result.one_or_none()

        if not row or row.total_votes is None or row.total_votes == 0:
            return None

        dem = row.dem_votes or 0
        rep = row.rep_votes or 0
        total = row.total_votes or 0

        return {
            "district_type": district_type,
            "district_id": district_id,
            "year": year,
            "race_type": race_type,
            "dem_votes": dem,
            "rep_votes": rep,
            "other_votes": row.other_votes or 0,
            "total_votes": total,
            "dem_pct": (dem / total * 100) if total > 0 else 0,
            "rep_pct": (rep / total * 100) if total > 0 else 0,
            "margin": ((dem - rep) / total * 100) if total > 0 else 0,
            "ward_count": row.ward_count or 0,
        }
