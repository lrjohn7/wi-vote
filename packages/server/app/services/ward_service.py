from sqlalchemy import select, func, or_, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from geoalchemy2.functions import ST_AsGeoJSON, ST_Contains, ST_SetSRID, ST_MakePoint

from app.models.ward import Ward
from app.models.election_result import ElectionResult


def _escape_like(value: str) -> str:
    """Escape special SQL LIKE pattern characters to prevent wildcard injection."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


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
            stmt = stmt.where(Ward.county.ilike(f"%{_escape_like(county)}%"))
        if municipality:
            stmt = stmt.where(Ward.municipality.ilike(f"%{_escape_like(municipality)}%"))
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
        """Search wards by name or municipality.

        Deduplicates across ward vintages by keeping only the most
        recent vintage for each ward_id.
        """
        pattern = f"%{_escape_like(query)}%"

        # Subquery: rank rows per ward_id by vintage descending
        ranked = (
            select(
                Ward.id,
                func.row_number()
                .over(partition_by=Ward.ward_id, order_by=Ward.ward_vintage.desc())
                .label("rn"),
            )
            .where(
                or_(
                    Ward.ward_name.ilike(pattern),
                    Ward.municipality.ilike(pattern),
                    Ward.county.ilike(pattern),
                )
            )
            .subquery()
        )

        stmt = (
            select(Ward)
            .join(ranked, Ward.id == ranked.c.id)
            .where(ranked.c.rn == 1)
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

    async def get_boundaries_geojson(self, vintage: int | None = None) -> str:
        """Get all ward boundaries as a raw GeoJSON string.

        Returns a FeatureCollection JSON string with ward_id as each
        feature 'id' field, required for MapLibre setFeatureState.

        Builds the JSON string directly, embedding PostGIS ST_AsGeoJSON
        output without an intermediate parse/re-serialize cycle.
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
        feature_parts: list[str] = []
        for row in rows:
            props = json.dumps({
                "ward_id": row.ward_id,
                "ward_name": row.ward_name,
                "municipality": row.municipality,
                "county": row.county,
                "assembly_district": row.assembly_district,
                "state_senate_district": row.state_senate_district,
                "congressional_district": row.congressional_district,
            })
            ward_id_json = json.dumps(row.ward_id)
            # row.geojson is already a valid JSON string from PostGIS
            feature_parts.append(
                f'{{"type":"Feature","id":{ward_id_json},"properties":{props},"geometry":{row.geojson}}}'
            )

        return '{"type":"FeatureCollection","features":[' + ",".join(feature_parts) + "]}"

    async def get_similar_wards(
        self, ward_id: str, limit: int = 10
    ) -> list[dict] | None:
        """Find wards most statistically similar to the given ward.

        Similarity is based on cosine similarity of a feature vector
        combining demographics (college_degree_pct, median_household_income,
        population_density, white_pct, black_pct, hispanic_pct) and recent
        presidential election margins (2024, 2020, 2016).

        Returns None if the target ward is not found or has no demographics.
        Returns an empty list if no similar wards can be computed.
        """
        import numpy as np

        from app.models.ward_demographic import WardDemographic

        # Presidential election years to include
        pres_years = [2024, 2020, 2016]

        # Build subqueries for presidential margins by year.
        margin_subqueries = []
        for yr in pres_years:
            sq = (
                select(
                    ElectionResult.ward_id.label("ward_id"),
                    func.avg(
                        case(
                            (
                                ElectionResult.total_votes > 0,
                                (ElectionResult.dem_votes - ElectionResult.rep_votes)
                                * 100.0
                                / ElectionResult.total_votes,
                            ),
                            else_=None,
                        )
                    ).label(f"margin_{yr}"),
                )
                .where(
                    ElectionResult.race_type == "president",
                    ElectionResult.election_year == yr,
                )
                .group_by(ElectionResult.ward_id)
                .subquery(name=f"m{yr}")
            )
            margin_subqueries.append((yr, sq))

        # Main query: join wards + demographics + margin subqueries
        stmt = select(
            Ward.ward_id,
            Ward.ward_name,
            Ward.municipality,
            Ward.county,
            WardDemographic.college_degree_pct,
            WardDemographic.median_household_income,
            WardDemographic.population_density,
            WardDemographic.white_pct,
            WardDemographic.black_pct,
            WardDemographic.hispanic_pct,
        )

        # Add margin columns
        for yr, sq in margin_subqueries:
            stmt = stmt.add_columns(sq.c[f"margin_{yr}"])

        # Join demographics
        stmt = stmt.join(
            WardDemographic,
            (WardDemographic.ward_id == Ward.ward_id)
            & (WardDemographic.ward_vintage == Ward.ward_vintage),
        )

        # Left-join each margin subquery
        for _yr, sq in margin_subqueries:
            stmt = stmt.outerjoin(sq, sq.c.ward_id == Ward.ward_id)

        # Use most recent vintage per ward
        latest_vintage = (
            select(
                Ward.ward_id,
                func.max(Ward.ward_vintage).label("max_vintage"),
            )
            .group_by(Ward.ward_id)
            .subquery(name="lv")
        )
        stmt = stmt.join(
            latest_vintage,
            (Ward.ward_id == latest_vintage.c.ward_id)
            & (Ward.ward_vintage == latest_vintage.c.max_vintage),
        )

        result = await self.db.execute(stmt)
        rows = result.all()

        if not rows:
            return []

        # Build feature matrix
        target_idx = None
        ward_data: list[dict] = []
        raw_features: list[list[float]] = []

        for i, row in enumerate(rows):
            ward_info = {
                "ward_id": row.ward_id,
                "ward_name": row.ward_name,
                "municipality": row.municipality,
                "county": row.county,
                "college_degree_pct": row.college_degree_pct,
                "median_household_income": row.median_household_income,
                "population_density": row.population_density,
                "white_pct": row.white_pct,
                "black_pct": row.black_pct,
                "hispanic_pct": row.hispanic_pct,
            }

            # Extract margin values
            margins: dict[str, float | None] = {}
            for yr in pres_years:
                col_name = f"margin_{yr}"
                val = getattr(row, col_name, None)
                margins[col_name] = val
                ward_info[col_name] = val

            ward_data.append(ward_info)

            # Build feature vector (use 0.0 for None)
            feat = [
                float(row.college_degree_pct or 0),
                float(row.median_household_income or 0),
                float(row.population_density or 0),
                float(row.white_pct or 0),
                float(row.black_pct or 0),
                float(row.hispanic_pct or 0),
            ]
            for yr in pres_years:
                val = margins[f"margin_{yr}"]
                feat.append(float(val) if val is not None else 0.0)

            raw_features.append(feat)

            if row.ward_id == ward_id:
                target_idx = i

        if target_idx is None:
            # Ward not found in results (no demographics)
            return None

        # Convert to numpy and normalize (min-max)
        features = np.array(raw_features, dtype=np.float64)
        mins = features.min(axis=0)
        maxs = features.max(axis=0)
        ranges = maxs - mins
        # Avoid division by zero for constant columns
        ranges[ranges == 0] = 1.0
        normalized = (features - mins) / ranges

        # Compute cosine similarity between target and all others
        target_vec = normalized[target_idx]
        target_norm = float(np.linalg.norm(target_vec))
        if target_norm == 0:
            return []

        similarities: list[tuple[int, float]] = []
        for i, vec in enumerate(normalized):
            if i == target_idx:
                continue
            vec_norm = float(np.linalg.norm(vec))
            if vec_norm == 0:
                sim = 0.0
            else:
                sim = float(np.dot(target_vec, vec) / (target_norm * vec_norm))
            similarities.append((i, sim))

        # Sort by similarity descending, take top N
        similarities.sort(key=lambda x: x[1], reverse=True)
        top = similarities[:limit]

        def _avg_margin(info: dict) -> float:
            """Compute average margin across available presidential elections."""
            vals = []
            for yr in pres_years:
                v = info.get(f"margin_{yr}")
                if v is not None:
                    vals.append(float(v))
            return sum(vals) / len(vals) if vals else 0.0

        results = []
        for idx, sim_score in top:
            info = ward_data[idx]
            results.append({
                "ward_id": info["ward_id"],
                "ward_name": info["ward_name"],
                "municipality": info["municipality"],
                "county": info["county"],
                "similarity_score": round(sim_score, 4),
                "college_pct": round(float(info["college_degree_pct"] or 0), 1),
                "median_income": int(info["median_household_income"] or 0),
                "population_density": round(float(info["population_density"] or 0), 1),
                "partisan_lean": round(_avg_margin(info), 2),
            })

        return results
