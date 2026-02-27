from fastapi import APIRouter, Query

router = APIRouter(prefix="/wards", tags=["wards"])


@router.get("")
async def list_wards(
    county: str | None = None,
    municipality: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
) -> dict:
    """List all wards with optional filtering."""
    return {"wards": [], "total": 0, "page": page, "page_size": page_size}


@router.get("/geocode")
async def geocode_ward(lat: float, lng: float) -> dict:
    """Find the ward containing the given coordinates."""
    return {"ward": None, "message": "Geocoding not yet implemented"}


@router.get("/search")
async def search_wards(q: str = Query(..., min_length=2)) -> dict:
    """Search wards by name or municipality."""
    return {"results": [], "query": q}


@router.get("/{ward_id}")
async def get_ward(ward_id: str) -> dict:
    """Get a single ward with all election results."""
    return {"ward_id": ward_id, "message": "Ward lookup not yet implemented"}
