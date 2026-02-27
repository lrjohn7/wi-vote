from fastapi import APIRouter

router = APIRouter(prefix="/aggregations", tags=["aggregations"])


@router.get("/county/{county}/{year}/{race_type}")
async def get_county_aggregation(
    county: str, year: int, race_type: str
) -> dict:
    """Get aggregated results for a county."""
    return {"county": county, "year": year, "race_type": race_type, "results": None}


@router.get("/district/{district_type}/{district_id}/{year}/{race_type}")
async def get_district_aggregation(
    district_type: str, district_id: str, year: int, race_type: str
) -> dict:
    """Get aggregated results for a district."""
    return {
        "district_type": district_type,
        "district_id": district_id,
        "year": year,
        "race_type": race_type,
        "results": None,
    }


@router.get("/statewide/{year}/{race_type}")
async def get_statewide_aggregation(year: int, race_type: str) -> dict:
    """Get statewide aggregated results."""
    return {"year": year, "race_type": race_type, "results": None}
