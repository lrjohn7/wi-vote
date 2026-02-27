from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.aggregation_service import AggregationService

router = APIRouter(prefix="/aggregations", tags=["aggregations"])


@router.get("/county/{county}/{year}/{race_type}")
async def get_county_aggregation(
    county: str,
    year: int,
    race_type: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get aggregated results for a county."""
    service = AggregationService(db)
    result = await service.get_county(county, year, race_type)
    if result is None:
        return {"county": county, "year": year, "race_type": race_type, "results": None}
    return result


@router.get("/district/{district_type}/{district_id}/{year}/{race_type}")
async def get_district_aggregation(
    district_type: str,
    district_id: str,
    year: int,
    race_type: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get aggregated results for a district."""
    service = AggregationService(db)
    result = await service.get_district(district_type, district_id, year, race_type)
    if result is None:
        return {
            "district_type": district_type,
            "district_id": district_id,
            "year": year,
            "race_type": race_type,
            "results": None,
        }
    return result


@router.get("/statewide/{year}/{race_type}")
async def get_statewide_aggregation(
    year: int,
    race_type: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get statewide aggregated results."""
    service = AggregationService(db)
    result = await service.get_statewide(year, race_type)
    if result is None:
        return {"year": year, "race_type": race_type, "results": None}
    return result
