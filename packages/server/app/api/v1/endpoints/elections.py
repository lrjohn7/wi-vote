from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.election_service import ElectionService

router = APIRouter(prefix="/elections", tags=["elections"])


@router.get("")
async def list_elections(
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """List all available elections (years + race types)."""
    response.headers["Cache-Control"] = "public, max-age=3600"
    service = ElectionService(db)
    elections = await service.list_elections()
    return {"elections": elections}


@router.get("/{year}/{race_type}")
async def get_election_results(
    year: int,
    race_type: str,
    county: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get all ward results for a specific election."""
    service = ElectionService(db)
    return await service.get_results(
        year=year,
        race_type=race_type,
        county=county,
        page=page,
        page_size=page_size,
    )


@router.get("/map-data/{year}/{race_type}")
async def get_map_data(
    year: int,
    race_type: str,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get ward results optimized for map rendering.

    Returns compact dict keyed by ward_id with demPct/repPct/margin/totalVotes.
    Designed for efficient setFeatureState updates on the frontend.
    """
    response.headers["Cache-Control"] = "public, max-age=86400"
    service = ElectionService(db)
    return await service.get_map_data(year, race_type)
