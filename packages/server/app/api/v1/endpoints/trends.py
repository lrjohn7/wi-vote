from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.trend_service import TrendService

router = APIRouter(prefix="/trends", tags=["trends"])


@router.get("/ward/{ward_id}")
async def get_ward_trend(
    ward_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get trend data for a specific ward."""
    service = TrendService(db)
    result = await service.get_ward_trend(ward_id)
    if result is None:
        return {"ward_id": ward_id, "trends": [], "elections": []}
    return result


@router.get("/area")
async def get_area_trends(
    county: str | None = None,
    municipality: str | None = None,
    district_type: str | None = None,
    district_id: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get aggregated trends for an area."""
    service = TrendService(db)
    return await service.get_area_trends(
        county=county,
        municipality=municipality,
        district_type=district_type,
        district_id=district_id,
    )


@router.post("/bulk-elections")
async def get_bulk_elections(
    ward_ids: list[str] = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get election histories for a list of ward IDs."""
    if len(ward_ids) > 500:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum 500 ward_ids allowed, received {len(ward_ids)}",
        )
    service = TrendService(db)
    data = await service.get_bulk_elections(ward_ids)
    return {"ward_count": len(data), "elections": data}


@router.get("/volatility")
async def get_volatility(
    race_type: str = Query("president"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get volatility (margin stddev) for all wards."""
    service = TrendService(db)
    return await service.get_volatility_map(race_type=race_type)


@router.get("/classify")
async def classify_trends(
    race_type: str = Query("president"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Bulk trend classification for all wards."""
    service = TrendService(db)
    return await service.classify_all(race_type=race_type)
