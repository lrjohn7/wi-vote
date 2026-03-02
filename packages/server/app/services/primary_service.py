import json

from sqlalchemy import select, func, distinct
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.functions import ST_AsGeoJSON

from app.models.primary import PrimaryReportingUnit, PrimaryResult


class PrimaryService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_primary_elections(self) -> list[dict]:
        """List all available primary elections (distinct year + race_type + party).

        Returns summary info including candidate count and total votes
        for each primary contest.
        """
        stmt = (
            select(
                PrimaryResult.election_year,
                PrimaryResult.race_type,
                PrimaryResult.party,
                func.count(distinct(PrimaryResult.candidate)).label("n_candidates"),
                func.sum(PrimaryResult.votes).label("total_votes"),
            )
            .group_by(
                PrimaryResult.election_year,
                PrimaryResult.race_type,
                PrimaryResult.party,
            )
            .order_by(
                PrimaryResult.election_year.desc(),
                PrimaryResult.race_type,
                PrimaryResult.party,
            )
        )
        result = await self.db.execute(stmt)
        return [
            {
                "year": row.election_year,
                "race_type": row.race_type,
                "party": row.party,
                "n_candidates": row.n_candidates,
                "total_votes": row.total_votes or 0,
            }
            for row in result.all()
        ]

    async def get_primary_results(
        self,
        year: int,
        race_type: str = "governor",
        party: str = "DEM",
    ) -> list[dict]:
        """Get statewide candidate results for a specific primary election.

        Returns per-candidate totals sorted by votes descending.
        """
        stmt = (
            select(
                PrimaryResult.candidate,
                func.sum(PrimaryResult.votes).label("total_votes"),
            )
            .where(
                PrimaryResult.election_year == year,
                PrimaryResult.race_type == race_type,
                PrimaryResult.party == party,
            )
            .group_by(PrimaryResult.candidate)
            .order_by(func.sum(PrimaryResult.votes).desc())
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        # Compute grand total for percentage calculation
        grand_total = sum(row.total_votes for row in rows) if rows else 0

        return [
            {
                "candidate": row.candidate,
                "votes": row.total_votes or 0,
                "vote_pct": round(
                    (row.total_votes / grand_total * 100) if grand_total > 0 else 0.0,
                    2,
                ),
            }
            for row in rows
        ]

    async def get_primary_results_by_ru(
        self,
        year: int,
        race_type: str = "governor",
        party: str = "DEM",
    ) -> list[dict]:
        """Get per-reporting-unit results for a specific primary election.

        Returns one row per (RU, candidate) pair with vote totals and
        the RU-level total for context.
        """
        stmt = (
            select(
                PrimaryResult.ru_id,
                PrimaryReportingUnit.ru_name,
                PrimaryReportingUnit.county,
                PrimaryResult.candidate,
                PrimaryResult.votes,
                PrimaryResult.total_votes,
                PrimaryResult.vote_pct,
            )
            .join(
                PrimaryReportingUnit,
                PrimaryResult.ru_id == PrimaryReportingUnit.ru_id,
            )
            .where(
                PrimaryResult.election_year == year,
                PrimaryResult.race_type == race_type,
                PrimaryResult.party == party,
            )
            .order_by(
                PrimaryReportingUnit.county,
                PrimaryReportingUnit.ru_name,
                PrimaryResult.votes.desc(),
            )
        )
        result = await self.db.execute(stmt)
        return [
            {
                "ru_id": row.ru_id,
                "ru_name": row.ru_name,
                "county": row.county,
                "candidate": row.candidate,
                "votes": row.votes,
                "total_votes": row.total_votes,
                "vote_pct": round(row.vote_pct, 2) if row.vote_pct else 0.0,
            }
            for row in result.all()
        ]

    async def get_primary_map_data(
        self,
        year: int,
        race_type: str = "governor",
        party: str = "DEM",
    ) -> dict:
        """Get GeoJSON FeatureCollection with primary results for map rendering.

        Each feature is a reporting unit with geometry and properties
        including the winner, per-candidate vote counts, and percentages.
        Only includes RUs that have geometry (geom IS NOT NULL).
        """
        # Step 1: Get all results for this election grouped by RU
        results_stmt = (
            select(
                PrimaryResult.ru_id,
                PrimaryResult.candidate,
                PrimaryResult.votes,
                PrimaryResult.total_votes,
                PrimaryResult.vote_pct,
            )
            .where(
                PrimaryResult.election_year == year,
                PrimaryResult.race_type == race_type,
                PrimaryResult.party == party,
            )
        )
        results_result = await self.db.execute(results_stmt)
        results_rows = results_result.all()

        # Build per-RU data structure
        ru_data: dict[str, dict] = {}
        for row in results_rows:
            ru_id = row.ru_id
            if ru_id not in ru_data:
                ru_data[ru_id] = {
                    "total_votes": row.total_votes,
                    "candidates": [],
                }
            ru_data[ru_id]["candidates"].append({
                "candidate": row.candidate,
                "votes": row.votes,
                "vote_pct": round(row.vote_pct, 2) if row.vote_pct else 0.0,
            })

        if not ru_data:
            return {
                "type": "FeatureCollection",
                "year": year,
                "race_type": race_type,
                "party": party,
                "ru_count": 0,
                "features": [],
            }

        # Step 2: Get RU geometries for matching RUs
        geo_stmt = (
            select(
                PrimaryReportingUnit.ru_id,
                PrimaryReportingUnit.ru_name,
                PrimaryReportingUnit.county,
                ST_AsGeoJSON(PrimaryReportingUnit.geom).label("geojson"),
            )
            .where(
                PrimaryReportingUnit.geom.isnot(None),
                PrimaryReportingUnit.ru_id.in_(list(ru_data.keys())),
            )
        )
        geo_result = await self.db.execute(geo_stmt)
        geo_rows = geo_result.all()

        # Step 3: Build GeoJSON features
        features = []
        for row in geo_rows:
            data = ru_data.get(row.ru_id)
            if not data:
                continue

            # Determine winner (candidate with most votes)
            candidates = sorted(
                data["candidates"], key=lambda c: c["votes"], reverse=True
            )
            winner = candidates[0] if candidates else None

            properties: dict = {
                "ru_id": row.ru_id,
                "ru_name": row.ru_name,
                "county": row.county,
                "total_votes": data["total_votes"],
                "winner": winner["candidate"] if winner else None,
                "winner_votes": winner["votes"] if winner else 0,
                "winner_pct": winner["vote_pct"] if winner else 0.0,
                "n_candidates": len(candidates),
            }

            # Add per-candidate fields for detailed tooltip rendering
            for c in candidates:
                safe_name = c["candidate"].replace(" ", "_").replace(".", "")
                properties[f"{safe_name}_votes"] = c["votes"]
                properties[f"{safe_name}_pct"] = c["vote_pct"]

            features.append({
                "type": "Feature",
                "id": row.ru_id,
                "properties": properties,
                "geometry": json.loads(row.geojson),
            })

        return {
            "type": "FeatureCollection",
            "year": year,
            "race_type": race_type,
            "party": party,
            "ru_count": len(features),
            "features": features,
        }

    async def get_primary_county_results(
        self,
        year: int,
        race_type: str = "governor",
        party: str = "DEM",
    ) -> list[dict]:
        """Get primary results aggregated by county.

        Returns each county with its list of candidates sorted by votes.
        """
        stmt = (
            select(
                PrimaryReportingUnit.county,
                PrimaryResult.candidate,
                func.sum(PrimaryResult.votes).label("votes"),
            )
            .join(
                PrimaryReportingUnit,
                PrimaryResult.ru_id == PrimaryReportingUnit.ru_id,
            )
            .where(
                PrimaryResult.election_year == year,
                PrimaryResult.race_type == race_type,
                PrimaryResult.party == party,
            )
            .group_by(PrimaryReportingUnit.county, PrimaryResult.candidate)
            .order_by(
                PrimaryReportingUnit.county,
                func.sum(PrimaryResult.votes).desc(),
            )
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        # Group by county
        counties: dict[str, dict] = {}
        for row in rows:
            county = row.county
            if county not in counties:
                counties[county] = {
                    "county": county,
                    "candidates": [],
                    "total_votes": 0,
                }
            counties[county]["candidates"].append({
                "name": row.candidate,
                "votes": row.votes or 0,
            })
            counties[county]["total_votes"] += row.votes or 0

        # Calculate percentages
        county_list = []
        for county_data in counties.values():
            total = county_data["total_votes"]
            for c in county_data["candidates"]:
                c["pct"] = round(
                    c["votes"] / total * 100, 2
                ) if total > 0 else 0.0
            county_list.append(county_data)

        # Sort by county name
        county_list.sort(key=lambda c: c["county"])
        return county_list

    async def get_primary_ru_detail(self, ru_id: str) -> dict | None:
        """Get all election history for a specific reporting unit.

        Returns the RU metadata plus all primary results across all
        years, grouped by (year, race_type, party).
        """
        # Get the RU record
        ru_stmt = select(PrimaryReportingUnit).where(
            PrimaryReportingUnit.ru_id == ru_id
        )
        ru_result = await self.db.execute(ru_stmt)
        ru = ru_result.scalar_one_or_none()

        if not ru:
            return None

        # Get all results for this RU
        results_stmt = (
            select(PrimaryResult)
            .where(PrimaryResult.ru_id == ru_id)
            .order_by(
                PrimaryResult.election_year.desc(),
                PrimaryResult.race_type,
                PrimaryResult.party,
                PrimaryResult.votes.desc(),
            )
        )
        results_result = await self.db.execute(results_stmt)
        results = results_result.scalars().all()

        # Group results by (year, race_type, party)
        elections: dict[tuple[int, str, str], list[dict]] = {}
        for r in results:
            key = (r.election_year, r.race_type, r.party)
            if key not in elections:
                elections[key] = []
            elections[key].append({
                "candidate": r.candidate,
                "votes": r.votes,
                "total_votes": r.total_votes,
                "vote_pct": round(r.vote_pct, 2) if r.vote_pct else 0.0,
            })

        election_list = [
            {
                "year": year,
                "race_type": race_type,
                "party": party,
                "candidates": candidates,
            }
            for (year, race_type, party), candidates in elections.items()
        ]

        return {
            "ru_id": ru.ru_id,
            "ru_name": ru.ru_name,
            "county": ru.county,
            "constituent_ward_ids": ru.constituent_ward_ids,
            "elections": election_list,
        }

