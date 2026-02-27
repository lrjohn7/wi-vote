from sqlalchemy import select, func, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.spring_election import SpringElectionResult


class SpringElectionService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_contests(self) -> list[dict]:
        """List all available spring election contests."""
        stmt = (
            select(
                SpringElectionResult.election_year,
                SpringElectionResult.election_date,
                SpringElectionResult.contest_name,
                SpringElectionResult.candidate_1_name,
                SpringElectionResult.candidate_2_name,
                func.count(SpringElectionResult.id).label("reporting_unit_count"),
                func.sum(SpringElectionResult.candidate_1_votes).label("total_c1"),
                func.sum(SpringElectionResult.candidate_2_votes).label("total_c2"),
                func.sum(SpringElectionResult.total_votes).label("total_votes"),
            )
            .group_by(
                SpringElectionResult.election_year,
                SpringElectionResult.election_date,
                SpringElectionResult.contest_name,
                SpringElectionResult.candidate_1_name,
                SpringElectionResult.candidate_2_name,
            )
            .order_by(SpringElectionResult.election_year.desc())
        )
        result = await self.db.execute(stmt)
        return [
            {
                "year": row.election_year,
                "election_date": row.election_date.isoformat() if row.election_date else None,
                "contest_name": row.contest_name,
                "candidate_1_name": row.candidate_1_name,
                "candidate_2_name": row.candidate_2_name,
                "reporting_unit_count": row.reporting_unit_count,
                "candidate_1_total": row.total_c1,
                "candidate_2_total": row.total_c2,
                "total_votes": row.total_votes,
            }
            for row in result.all()
        ]

    async def get_results(
        self,
        year: int,
        county: str | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 100,
    ) -> dict:
        """Get spring election results with filtering and pagination."""
        stmt = select(SpringElectionResult).where(
            SpringElectionResult.election_year == year,
        )

        if county:
            stmt = stmt.where(SpringElectionResult.county.ilike(f"%{county}%"))
        if search:
            stmt = stmt.where(SpringElectionResult.reporting_unit.ilike(f"%{search}%"))

        # Count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await self.db.execute(count_stmt)).scalar() or 0

        # Paginate
        stmt = stmt.order_by(
            SpringElectionResult.county,
            SpringElectionResult.reporting_unit,
        ).offset((page - 1) * page_size).limit(page_size)

        result = await self.db.execute(stmt)
        rows = result.scalars().all()

        return {
            "results": [
                {
                    "id": r.id,
                    "county": r.county,
                    "reporting_unit": r.reporting_unit,
                    "election_year": r.election_year,
                    "contest_name": r.contest_name,
                    "candidate_1_name": r.candidate_1_name,
                    "candidate_1_votes": r.candidate_1_votes,
                    "candidate_1_pct": round(r.candidate_1_pct, 2),
                    "candidate_2_name": r.candidate_2_name,
                    "candidate_2_votes": r.candidate_2_votes,
                    "candidate_2_pct": round(r.candidate_2_pct, 2),
                    "scattering_votes": r.scattering_votes,
                    "total_votes": r.total_votes,
                    "margin": round(r.margin, 2),
                }
                for r in rows
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    async def get_county_summary(self, year: int) -> list[dict]:
        """Get results aggregated by county for a given year."""
        stmt = (
            select(
                SpringElectionResult.county,
                SpringElectionResult.candidate_1_name,
                SpringElectionResult.candidate_2_name,
                func.sum(SpringElectionResult.candidate_1_votes).label("c1_votes"),
                func.sum(SpringElectionResult.candidate_2_votes).label("c2_votes"),
                func.sum(SpringElectionResult.scattering_votes).label("scat_votes"),
                func.sum(SpringElectionResult.total_votes).label("total"),
                func.count(SpringElectionResult.id).label("reporting_units"),
            )
            .where(SpringElectionResult.election_year == year)
            .group_by(
                SpringElectionResult.county,
                SpringElectionResult.candidate_1_name,
                SpringElectionResult.candidate_2_name,
            )
            .order_by(SpringElectionResult.county)
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        return [
            {
                "county": row.county,
                "candidate_1_name": row.candidate_1_name,
                "candidate_1_votes": row.c1_votes,
                "candidate_2_name": row.candidate_2_name,
                "candidate_2_votes": row.c2_votes,
                "total_votes": row.total,
                "margin": round((row.c1_votes - row.c2_votes) / row.total * 100, 2) if row.total > 0 else 0,
                "reporting_units": row.reporting_units,
            }
            for row in rows
        ]
