from pydantic import BaseModel


class WardSummary(BaseModel):
    ward_id: str
    ward_name: str
    municipality: str
    county: str
    congressional_district: str | None = None
    state_senate_district: str | None = None
    assembly_district: str | None = None

    model_config = {"from_attributes": True}


class WardResponse(WardSummary):
    municipality_type: str | None = None
    ward_vintage: int
    area_sq_miles: float | None = None
    is_estimated: bool = False
    elections: list["ElectionResultResponse"] = []


# Avoid circular import
from app.api.v1.schemas.election import ElectionResultResponse  # noqa: E402

WardResponse.model_rebuild()
