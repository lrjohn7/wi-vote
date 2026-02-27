import httpx
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.functions import ST_Contains, ST_SetSRID, ST_MakePoint

from app.core.config import settings
from app.models.ward import Ward


class GeocodingService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def geocode_address(self, address: str) -> dict | None:
        """Geocode an address using the US Census Geocoder API."""
        url = f"{settings.census_geocoder_url}/locations/onelineaddress"
        params = {
            "address": address,
            "benchmark": "Public_AR_Current",
            "format": "json",
        }
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

        matches = data.get("result", {}).get("addressMatches", [])
        if not matches:
            return None

        coords = matches[0].get("coordinates", {})
        return {
            "lat": coords.get("y"),
            "lng": coords.get("x"),
            "matchedAddress": matches[0].get("matchedAddress"),
        }

    async def find_ward_at_point(self, lat: float, lng: float) -> dict | None:
        """Find the ward containing the given lat/lng point via PostGIS spatial query."""
        point = ST_SetSRID(ST_MakePoint(lng, lat), 4326)

        stmt = select(Ward).where(ST_Contains(Ward.geom, point)).limit(1)
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
