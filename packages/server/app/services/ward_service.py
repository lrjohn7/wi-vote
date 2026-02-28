from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from geoalchemy2.functions import ST_AsGeoJSON, ST_Contains, ST_SetSRID, ST_MakePoint

from app.models.ward import Ward
from app.models.election_result import ElectionResult


class WardService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_all(
        self,
        county: str | None = None,
        municipality: str | None = None,
        vintage: int | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> dict:
        """List wards with optional filtering and pagination."""
        stmt = select(Ward)

        if county:
            stmt = stmt.where(Ward.county.ilike(f"%{county}%"))
        if municipality:
            stmt = stmt.where(Ward.municipality.ilike(f"%{municipality}%"))
        if vintage:
            stmt = stmt.where(Ward.ward_vintage == vintage)

        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await self.db.execute(count_stmt)).scalar() or 0

        # Paginate
        stmt = stmt.order_by(Ward.ward_name).offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(stmt)
        wards = result.scalars().all()

        return {
            "wards": [
                {
                    "ward_id": w.ward_id,
                    "ward_name": w.ward_name,
                    "municipality": w.municipality,
                    "county": w.county,
                    "congressional_district": w.congressional_district,
                    "state_senate_district": w.state_senate_district,
                    "assembly_district": w.assembly_district,
                    "ward_vintage": w.ward_vintage,
                }
                for w in wards
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    async def get_by_id(self, ward_id: str, vintage: int | None = None) -> dict | None:
        """Get a single ward by ID with all election results.

        If vintage is not specified, returns the most recent vintage.
        """
        stmt = (
            select(Ward)
            .options(selectinload(Ward.election_results))
            .where(Ward.ward_id == ward_id)
        )
        if vintage:
            stmt = stmt.where(Ward.ward_vintage == vintage)
        else:
            stmt = stmt.order_by(Ward.ward_vintage.desc())
        stmt = stmt.limit(1)
        result = await self.db.execute(stmt)
        ward = result.scalar_one_or_none()

        if not ward:
            return None

        return {
            "ward_id": ward.ward_id,
            "ward_name": ward.ward_name,
            "municipality": ward.municipality,
            "municipality_type": ward.municipality_type,
            "county": ward.county,
            "congressional_district": ward.congressional_district,
            "state_senate_district": ward.state_senate_district,
            "assembly_district": ward.assembly_district,
            "ward_vintage": ward.ward_vintage,
            "area_sq_miles": ward.area_sq_miles,
            "is_estimated": ward.is_estimated,
            "elections": sorted(
                [
                    {
                        "ward_id": e.ward_id,
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
                    for e in ward.election_results
                ],
                key=lambda x: (-x["election_year"], x["race_type"]),
            ),
        }

    async def geocode(self, lat: float, lng: float, vintage: int | None = None) -> dict | None:
        """Find the ward containing the given point.

        If vintage is not specified, returns the most recent vintage match.
        """
        point = ST_SetSRID(ST_MakePoint(lng, lat), 4326)
        stmt = (
            select(Ward)
            .options(selectinload(Ward.election_results))
            .where(ST_Contains(Ward.geom, point))
        )
        if vintage:
            stmt = stmt.where(Ward.ward_vintage == vintage)
        else:
            stmt = stmt.order_by(Ward.ward_vintage.desc())
        stmt = stmt.limit(1)
        result = await self.db.execute(stmt)
        ward = result.scalar_one_or_none()

        if not ward:
            return None

        return {
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

    async def search(self, query: str, limit: int = 20) -> list[dict]:
        """Search wards by name or municipality."""
        pattern = f"%{query}%"
        stmt = (
            select(Ward)
            .where(
                or_(
                    Ward.ward_name.ilike(pattern),
                    Ward.municipality.ilike(pattern),
                    Ward.county.ilike(pattern),
                )
            )
            .order_by(Ward.ward_name)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        wards = result.scalars().all()

        return [
            {
                "ward_id": w.ward_id,
                "ward_name": w.ward_name,
                "municipality": w.municipality,
                "county": w.county,
                "congressional_district": w.congressional_district,
                "state_senate_district": w.state_senate_district,
                "assembly_district": w.assembly_district,
                "ward_vintage": w.ward_vintage,
            }
            for w in wards
        ]

    async def get_boundaries_geojson(self, vintage: int | None = None) -> dict:
        """Get all ward boundaries as GeoJSON FeatureCollection.

        Returns features with ward_id as the feature 'id' field,
        required for MapLibre setFeatureState.
        """
        stmt = select(
            Ward.ward_id,
            Ward.ward_name,
            Ward.municipality,
            Ward.county,
            Ward.assembly_district,
            Ward.state_senate_district,
            Ward.congressional_district,
            ST_AsGeoJSON(Ward.geom).label("geojson"),
        )

        if vintage:
            stmt = stmt.where(Ward.ward_vintage == vintage)

        result = await self.db.execute(stmt)
        rows = result.all()

        import json
        features = []
        for row in rows:
            features.append({
                "type": "Feature",
                "id": row.ward_id,
                "properties": {
                    "ward_id": row.ward_id,
                    "ward_name": row.ward_name,
                    "municipality": row.municipality,
                    "county": row.county,
                    "assembly_district": row.assembly_district,
                    "state_senate_district": row.state_senate_district,
                    "congressional_district": row.congressional_district,
                },
                "geometry": json.loads(row.geojson),
            })

        return {
            "type": "FeatureCollection",
            "features": features,
        }
