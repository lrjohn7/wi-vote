from fastapi import APIRouter

router = APIRouter(prefix="/elections", tags=["elections"])


@router.get("")
async def list_elections() -> dict:
    """List all available elections (years + race types)."""
    return {"elections": []}


@router.get("/{year}/{race_type}")
async def get_election_results(year: int, race_type: str) -> dict:
    """Get all ward results for a specific election."""
    return {"year": year, "race_type": race_type, "results": []}


@router.get("/map-data/{year}/{race_type}")
async def get_map_data(year: int, race_type: str) -> dict:
    """Get ward results optimized for map rendering."""
    return {"year": year, "race_type": race_type, "features": []}
