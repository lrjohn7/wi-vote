from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import ORJSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.ward_service import WardService
from app.services.geocoding_service import GeocodingService

router = APIRouter(prefix="/wards", tags=["wards"])


@router.get("")
async def list_wards(
    county: str | None = None,
    municipality: str | None = None,
    vintage: int | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """List all wards with optional filtering."""
    service = WardService(db)
    return await service.get_all(
        county=county,
        municipality=municipality,
        vintage=vintage,
        page=page,
        page_size=page_size,
    )


@router.get("/boundaries")
async def get_boundaries(
    vintage: int | None = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get all ward boundaries as GeoJSON FeatureCollection.

    Used by the frontend map to render ward polygons.
    Features include ward_id as the 'id' field for setFeatureState.
    """
    service = WardService(db)
    return await service.get_boundaries_geojson(vintage=vintage)


@router.get("/geocode")
async def geocode_ward(
    lat: float,
    lng: float,
    address: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Find the ward containing the given coordinates or address."""
    if address:
        geo_service = GeocodingService(db)
        geocode_result = await geo_service.geocode_address(address)
        if not geocode_result:
            raise HTTPException(status_code=404, detail="Address not found")
        lat = geocode_result["lat"]
        lng = geocode_result["lng"]

    service = WardService(db)
    ward = await service.geocode(lat, lng)
    if not ward:
        raise HTTPException(
            status_code=404,
            detail="No ward found at the given coordinates",
        )
    return {"ward": ward, "coordinates": {"lat": lat, "lng": lng}}


@router.get("/search")
async def search_wards(
    q: str = Query(..., min_length=2),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Search wards by name or municipality."""
    service = WardService(db)
    results = await service.search(q, limit=limit)
    return {"results": results, "query": q, "count": len(results)}


@router.get("/{ward_id}")
async def get_ward(
    ward_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get a single ward with all election results."""
    service = WardService(db)
    ward = await service.get_by_id(ward_id)
    if not ward:
        raise HTTPException(status_code=404, detail=f"Ward {ward_id} not found")
    return ward
