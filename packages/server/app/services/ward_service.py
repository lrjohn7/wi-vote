from sqlalchemy.ext.asyncio import AsyncSession


class WardService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_all(
        self,
        county: str | None = None,
        municipality: str | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> dict:
        """List wards with optional filtering and pagination."""
        # TODO: implement query
        return {"wards": [], "total": 0, "page": page, "page_size": page_size}

    async def get_by_id(self, ward_id: str) -> dict | None:
        """Get a single ward by ID with all election results."""
        # TODO: implement query
        return None

    async def geocode(self, lat: float, lng: float) -> dict | None:
        """Find the ward containing the given point."""
        # TODO: implement spatial query using ST_Contains
        return None

    async def search(self, query: str) -> list[dict]:
        """Search wards by name or municipality."""
        # TODO: implement ILIKE search
        return []
