from sqlalchemy import select, func, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.election_result import ElectionResult


class ElectionService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_elections(self) -> list[dict]:
        """List all available elections (distinct year + race_type combinations)."""
        stmt = (
            select(
                ElectionResult.election_year,
                ElectionResult.race_type,
                func.count(ElectionResult.id).label("ward_count"),
            )
            .group_by(ElectionResult.election_year, ElectionResult.race_type)
            .order_by(ElectionResult.election_year.desc(), ElectionResult.race_type)
        )
        result = await self.db.execute(stmt)
        return [
            {
                "year": row.election_year,
                "race_type": row.race_type,
                "ward_count": row.ward_count,
            }
            for row in result.all()
        ]

    async def get_results(
        self,
        year: int,
        race_type: str,
        county: str | None = None,
        page: int = 1,
        page_size: int = 100,
    ) -> dict:
        """Get all ward results for a specific election."""
        stmt = select(ElectionResult).where(
            ElectionResult.election_year == year,
            ElectionResult.race_type == race_type,
        )
        if county:
            # Join to wards to filter by county
            from app.models.ward import Ward
            stmt = stmt.join(
                Ward,
                (ElectionResult.ward_id == Ward.ward_id)
                & (ElectionResult.ward_vintage == Ward.ward_vintage),
            ).where(
                Ward.county.ilike(f"%{county}%")
            )

        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await self.db.execute(count_stmt)).scalar() or 0

        # Paginate
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(stmt)
        rows = result.scalars().all()

        return {
            "results": [
                {
                    "ward_id": r.ward_id,
                    "election_year": r.election_year,
                    "race_type": r.race_type,
                    "dem_votes": r.dem_votes,
                    "rep_votes": r.rep_votes,
                    "other_votes": r.other_votes,
                    "total_votes": r.total_votes,
                    "dem_pct": r.dem_pct,
                    "rep_pct": r.rep_pct,
                    "margin": r.margin,
                    "is_estimate": r.is_estimate,
                }
                for r in rows
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    async def get_map_data(self, year: int, race_type: str) -> dict:
        """Get compact ward results optimized for map rendering via setFeatureState.

        Returns {ward_id: {demPct, repPct, margin, totalVotes}} for all wards,
        plus top-level candidate names (same for the entire election).
        """
        stmt = select(
            ElectionResult.ward_id,
            ElectionResult.dem_votes,
            ElectionResult.rep_votes,
            ElectionResult.other_votes,
            ElectionResult.total_votes,
            ElectionResult.is_estimate,
            ElectionResult.dem_candidate,
            ElectionResult.rep_candidate,
        ).where(
            ElectionResult.election_year == year,
            ElectionResult.race_type == race_type,
        )

        result = await self.db.execute(stmt)
        rows = result.all()

        data = {}
        dem_candidate: str | None = None
        rep_candidate: str | None = None
        for row in rows:
            total = row.total_votes
            if total == 0:
                continue
            data[row.ward_id] = {
                "demPct": round(row.dem_votes / total * 100, 2),
                "repPct": round(row.rep_votes / total * 100, 2),
                "margin": round((row.dem_votes - row.rep_votes) / total * 100, 2),
                "totalVotes": total,
                "demVotes": row.dem_votes,
                "repVotes": row.rep_votes,
                "isEstimate": row.is_estimate,
            }
            # Capture candidate names from first row that has them
            if dem_candidate is None and row.dem_candidate:
                dem_candidate = row.dem_candidate
            if rep_candidate is None and row.rep_candidate:
                rep_candidate = row.rep_candidate

        return {
            "year": year,
            "raceType": race_type,
            "wardCount": len(data),
            "demCandidate": dem_candidate,
            "repCandidate": rep_candidate,
            "data": data,
        }
