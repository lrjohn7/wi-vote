from pydantic import BaseModel


class ElectionSummary(BaseModel):
    year: int
    race_type: str
    race_name: str | None = None
    ward_count: int = 0


class ElectionResultResponse(BaseModel):
    ward_id: str
    election_year: int
    race_type: str
    race_name: str | None = None
    dem_candidate: str | None = None
    rep_candidate: str | None = None
    dem_votes: int
    rep_votes: int
    other_votes: int
    total_votes: int
    dem_pct: float
    rep_pct: float
    margin: float
    is_estimate: bool = False

    model_config = {"from_attributes": True}


class WardMapEntry(BaseModel):
    demPct: float
    repPct: float
    margin: float
    totalVotes: int
    demVotes: int
    repVotes: int
    isEstimate: bool


class MapDataResponse(BaseModel):
    year: int
    raceType: str
    wardCount: int
    data: dict[str, WardMapEntry]
