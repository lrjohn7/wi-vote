from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.ward import Ward
from app.models.election_result import ElectionResult
from app.models.ward_trend import WardTrend
from app.models.election_aggregation import ElectionAggregation


class ReportCardService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_report_card(self, ward_id: str, race_type: str = "president") -> dict | None:
        """Build a full report card for a ward."""
        # Fetch ward with elections
        stmt = (
            select(Ward)
            .options(selectinload(Ward.election_results))
            .where(Ward.ward_id == ward_id)
        )
        result = await self.db.execute(stmt)
        ward = result.scalar_one_or_none()

        if not ward:
            return None

        # Build metadata
        metadata = {
            "ward_id": ward.ward_id,
            "ward_name": ward.ward_name,
            "municipality": ward.municipality,
            "municipality_type": ward.municipality_type,
            "county": ward.county,
            "congressional_district": ward.congressional_district,
            "state_senate_district": ward.state_senate_district,
            "assembly_district": ward.assembly_district,
            "ward_vintage": ward.ward_vintage,
            "is_estimated": ward.is_estimated,
        }

        # Partisan lean + percentile
        partisan_lean = await self._get_partisan_lean(ward)

        # Trend data
        trend = await self._get_trend(ward_id, race_type)

        # Election history
        elections = self._format_elections(ward.election_results)

        # Comparisons (ward vs county vs state)
        comparisons = await self._get_comparisons(ward, race_type)

        # Turnout data
        turnout = self._get_turnout(ward.election_results, race_type)

        # Check for any estimates
        has_estimates = any(e.is_estimate for e in ward.election_results)

        return {
            "metadata": metadata,
            "partisan_lean": partisan_lean,
            "trend": trend,
            "elections": elections,
            "comparisons": comparisons,
            "turnout": turnout,
            "has_estimates": has_estimates,
        }

    async def _get_partisan_lean(self, ward: Ward) -> dict:
        """Get partisan lean score and percentile."""
        lean = ward.partisan_lean

        if lean is None:
            return {
                "score": None,
                "label": "N/A",
                "elections_used": 0,
                "percentile": None,
            }

        # Count presidential elections used
        pres_elections = sorted(
            [e for e in ward.election_results if e.race_type == "president"],
            key=lambda e: e.election_year,
            reverse=True,
        )
        elections_used = min(len(pres_elections), 3)

        # Compute percentile: how many wards have a lower partisan lean
        count_below = await self.db.execute(
            select(func.count()).select_from(Ward).where(
                Ward.partisan_lean < lean,
                Ward.partisan_lean.is_not(None),
            )
        )
        below = count_below.scalar() or 0

        count_total = await self.db.execute(
            select(func.count()).select_from(Ward).where(
                Ward.partisan_lean.is_not(None),
            )
        )
        total = count_total.scalar() or 1

        percentile = round(below / total * 100, 1)

        # Format label
        if lean > 0:
            label = f"D+{abs(lean):.1f}"
        elif lean < 0:
            label = f"R+{abs(lean):.1f}"
        else:
            label = "Even"

        return {
            "score": round(lean, 2),
            "label": label,
            "elections_used": elections_used,
            "percentile": percentile,
        }

    async def _get_trend(self, ward_id: str, race_type: str) -> dict:
        """Get pre-computed trend data for the ward."""
        stmt = select(WardTrend).where(
            WardTrend.ward_id == ward_id,
            WardTrend.race_type == race_type,
        )
        result = await self.db.execute(stmt)
        trend = result.scalar_one_or_none()

        if not trend:
            return {
                "direction": "inconclusive",
                "slope": None,
                "r_squared": None,
                "p_value": None,
                "is_significant": False,
                "elections_analyzed": 0,
                "start_year": None,
                "end_year": None,
            }

        return {
            "direction": trend.trend_direction or "inconclusive",
            "slope": trend.trend_slope,
            "r_squared": trend.trend_r_squared,
            "p_value": trend.trend_p_value,
            "is_significant": (trend.trend_p_value or 1.0) < 0.05,
            "elections_analyzed": trend.elections_analyzed or 0,
            "start_year": trend.start_year,
            "end_year": trend.end_year,
        }

    def _format_elections(self, election_results: list[ElectionResult]) -> list[dict]:
        """Format election results sorted by year descending, then race type."""
        return sorted(
            [
                {
                    "election_year": e.election_year,
                    "race_type": e.race_type,
                    "race_name": e.race_name,
                    "dem_candidate": e.dem_candidate,
                    "rep_candidate": e.rep_candidate,
                    "dem_votes": e.dem_votes,
                    "rep_votes": e.rep_votes,
                    "other_votes": e.other_votes,
                    "total_votes": e.total_votes,
                    "dem_pct": round(e.dem_pct, 2),
                    "rep_pct": round(e.rep_pct, 2),
                    "margin": round(e.margin, 2),
                    "is_estimate": e.is_estimate,
                }
                for e in election_results
            ],
            key=lambda x: (-x["election_year"], x["race_type"]),
        )

    async def _get_comparisons(self, ward: Ward, race_type: str) -> list[dict]:
        """Get ward vs county vs state comparisons for each election."""
        # Filter ward elections to the given race type
        ward_elections = {
            e.election_year: round(e.margin, 2)
            for e in ward.election_results
            if e.race_type == race_type
        }

        if not ward_elections:
            return []

        # Get county aggregations
        county_stmt = select(ElectionAggregation).where(
            ElectionAggregation.aggregation_level == "county",
            ElectionAggregation.aggregation_key == ward.county,
            ElectionAggregation.race_type == race_type,
        )
        county_result = await self.db.execute(county_stmt)
        county_aggs = {a.election_year: a.margin for a in county_result.scalars().all()}

        # Get statewide aggregations
        state_stmt = select(ElectionAggregation).where(
            ElectionAggregation.aggregation_level == "statewide",
            ElectionAggregation.aggregation_key == "WI",
            ElectionAggregation.race_type == race_type,
        )
        state_result = await self.db.execute(state_stmt)
        state_aggs = {a.election_year: a.margin for a in state_result.scalars().all()}

        # Build comparisons for each year we have ward data
        comparisons = []
        for year in sorted(ward_elections.keys()):
            comparisons.append({
                "election_year": year,
                "race_type": race_type,
                "ward_margin": ward_elections[year],
                "county_margin": round(county_aggs.get(year, 0), 2) if year in county_aggs else None,
                "state_margin": round(state_aggs.get(year, 0), 2) if year in state_aggs else None,
            })

        return comparisons

    def _get_turnout(self, election_results: list[ElectionResult], race_type: str) -> list[dict]:
        """Get turnout data for a race type."""
        return sorted(
            [
                {
                    "election_year": e.election_year,
                    "race_type": e.race_type,
                    "total_votes": e.total_votes,
                }
                for e in election_results
                if e.race_type == race_type
            ],
            key=lambda x: x["election_year"],
        )
