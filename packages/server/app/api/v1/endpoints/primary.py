from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.primary_service import PrimaryService


# --- Pydantic response models ---


class PrimaryElectionInfo(BaseModel):
    """Summary of a single primary election contest."""
    year: int
    race_type: str
    party: str
    n_candidates: int
    total_votes: int


class PrimaryCandidateResult(BaseModel):
    """Statewide result for one candidate in a primary."""
    candidate: str
    votes: int
    vote_pct: float


class PrimaryRuResult(BaseModel):
    """Per-reporting-unit result for one candidate."""
    ru_id: str
    ru_name: str
    county: str
    candidate: str
    votes: int
    total_votes: int
    vote_pct: float


class PrimaryCountyCandidateResult(BaseModel):
    """One candidate result within a county."""
    name: str
    votes: int
    pct: float


class PrimaryCountyResult(BaseModel):
    """Aggregated results for one county."""
    county: str
    candidates: list[PrimaryCountyCandidateResult]
    total_votes: int


class PrimaryRuElection(BaseModel):
    """One election contest within an RU detail view."""
    year: int
    race_type: str
    party: str
    candidates: list[PrimaryCandidateResult]


class PrimaryRuDetail(BaseModel):
    """Full detail for a single reporting unit."""
    ru_id: str
    ru_name: str
    county: str
    constituent_ward_ids: list[str] | None
    elections: list[PrimaryRuElection]


# --- Router ---


router = APIRouter(prefix="/primary", tags=["primary"])


@router.get("/elections")
async def list_primary_elections(
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """List all available primary elections (years + race types + parties)."""
    response.headers["Cache-Control"] = "public, max-age=3600"
    service = PrimaryService(db)
    elections = await service.get_primary_elections()
    return {"elections": elections}


@router.get("/results/{year}")
async def get_primary_results(
    year: int,
    race_type: str = Query("governor", description="Race type (governor, us_senate, etc.)"),
    party: str = Query("DEM", description="Party (DEM or REP)"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get statewide candidate results for a specific primary election."""
    service = PrimaryService(db)
    results = await service.get_primary_results(year, race_type, party)
    if not results:
        raise HTTPException(
            status_code=404,
            detail=f"No primary results found for {year} {party} {race_type}",
        )
    return {
        "year": year,
        "race_type": race_type,
        "party": party,
        "candidates": results,
    }


@router.get("/results/{year}/by-ru")
async def get_primary_results_by_ru(
    year: int,
    race_type: str = Query("governor", description="Race type (governor, us_senate, etc.)"),
    party: str = Query("DEM", description="Party (DEM or REP)"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get per-reporting-unit results for a specific primary election."""
    service = PrimaryService(db)
    results = await service.get_primary_results_by_ru(year, race_type, party)
    return {
        "year": year,
        "race_type": race_type,
        "party": party,
        "result_count": len(results),
        "results": results,
    }


@router.get("/map-data/{year}")
async def get_primary_map_data(
    year: int,
    response: Response,
    race_type: str = Query("governor", description="Race type (governor, us_senate, etc.)"),
    party: str = Query("DEM", description="Party (DEM or REP)"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get GeoJSON with primary results joined for map rendering.

    Returns a GeoJSON FeatureCollection where each feature is a reporting
    unit with properties including the winner, per-candidate votes and
    percentages. Only includes RUs that have geometry.
    """
    response.headers["Cache-Control"] = "public, max-age=86400"
    service = PrimaryService(db)
    return await service.get_primary_map_data(year, race_type, party)


@router.get("/counties/{year}")
async def get_primary_county_results(
    year: int,
    race_type: str = Query("governor", description="Race type (governor, us_senate, etc.)"),
    party: str = Query("DEM", description="Party (DEM or REP)"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get primary results aggregated by county."""
    service = PrimaryService(db)
    counties = await service.get_primary_county_results(year, race_type, party)
    return {
        "year": year,
        "race_type": race_type,
        "party": party,
        "county_count": len(counties),
        "counties": counties,
    }


@router.get("/ru/{ru_id}")
async def get_primary_ru_detail(
    ru_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get all election history for a specific reporting unit."""
    service = PrimaryService(db)
    detail = await service.get_primary_ru_detail(ru_id)
    if detail is None:
        raise HTTPException(
            status_code=404,
            detail=f"Reporting unit {ru_id} not found",
        )
    return detail

