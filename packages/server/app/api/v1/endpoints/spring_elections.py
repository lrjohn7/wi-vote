from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.spring_election_service import SpringElectionService

router = APIRouter(prefix="/spring-elections", tags=["spring-elections"])


@router.get("")
async def list_spring_contests(
    db: AsyncSession = Depends(get_db),
) -> dict:
    """List all available spring election contests (Supreme Court, etc.)."""
    service = SpringElectionService(db)
    contests = await service.list_contests()
    return {"contests": contests}


@router.get("/{year}")
async def get_spring_results(
    year: int,
    county: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get spring election results for a specific year.

    Filterable by county name and reporting unit search.
    """
    service = SpringElectionService(db)
    return await service.get_results(
        year=year,
        county=county,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get("/{year}/counties")
async def get_spring_county_summary(
    year: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get spring election results aggregated by county."""
    service = SpringElectionService(db)
    counties = await service.get_county_summary(year)
    return {"counties": counties, "year": year}
