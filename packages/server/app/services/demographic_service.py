from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ward_demographic import WardDemographic


class DemographicService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_ward_demographics(self, ward_id: str) -> dict | None:
        """Get demographics for a single ward."""
        stmt = select(WardDemographic).where(WardDemographic.ward_id == ward_id)
        result = await self.db.execute(stmt)
        demo = result.scalars().first()

        if not demo:
            return None

        return {
            "ward_id": demo.ward_id,
            "census_year": demo.census_year,
            "total_population": demo.total_population,
            "voting_age_population": demo.voting_age_population,
            "white_pct": demo.white_pct,
            "black_pct": demo.black_pct,
            "hispanic_pct": demo.hispanic_pct,
            "asian_pct": demo.asian_pct,
            "college_degree_pct": demo.college_degree_pct,
            "median_household_income": demo.median_household_income,
            "urban_rural_class": demo.urban_rural_class,
            "population_density": demo.population_density,
            "ward_vintage": demo.ward_vintage,
        }

    async def get_bulk_demographics(
        self, ward_ids: list[str] | None = None
    ) -> dict[str, dict]:
        """Get demographics for all wards (or filtered list) as compact dict."""
        stmt = select(WardDemographic)
        if ward_ids:
            stmt = stmt.where(WardDemographic.ward_id.in_(ward_ids))

        result = await self.db.execute(stmt)
        demos = result.scalars().all()

        return {
            d.ward_id: {
                "total_population": d.total_population,
                "voting_age_population": d.voting_age_population,
                "white_pct": d.white_pct,
                "black_pct": d.black_pct,
                "hispanic_pct": d.hispanic_pct,
                "asian_pct": d.asian_pct,
                "college_degree_pct": d.college_degree_pct,
                "median_household_income": d.median_household_income,
                "urban_rural_class": d.urban_rural_class,
                "population_density": d.population_density,
            }
            for d in demos
        }

    async def get_urban_rural_counts(self) -> dict:
        """Get summary counts by urban/rural classification."""
        stmt = (
            select(
                WardDemographic.urban_rural_class,
                func.count().label("count"),
                func.avg(WardDemographic.total_population).label("avg_population"),
                func.avg(WardDemographic.college_degree_pct).label("avg_college_pct"),
                func.avg(WardDemographic.median_household_income).label("avg_income"),
            )
            .group_by(WardDemographic.urban_rural_class)
        )

        result = await self.db.execute(stmt)
        rows = result.all()

        classifications = {}
        total = 0
        for row in rows:
            cls = row.urban_rural_class or "unknown"
            count = row.count
            total += count
            classifications[cls] = {
                "count": count,
                "avg_population": round(row.avg_population, 0) if row.avg_population else None,
                "avg_college_pct": round(row.avg_college_pct, 1) if row.avg_college_pct else None,
                "avg_income": round(row.avg_income, 0) if row.avg_income else None,
            }

        return {
            "total_wards": total,
            "classifications": classifications,
        }
