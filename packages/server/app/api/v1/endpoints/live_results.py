from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.live_result import LiveResult, LiveElection

router = APIRouter(prefix="/live", tags=["live-results"])


class LiveElectionResponse(BaseModel):
    election_date: str
    election_name: str
    is_active: bool
    total_wards: int
    wards_reporting: int
    pct_reporting: float
    last_updated: str

    model_config = {"from_attributes": True}


class LiveWardResult(BaseModel):
    ward_id: str
    dem_votes: int
    rep_votes: int
    other_votes: int
    total_votes: int
    pct_reporting: float
    is_final: bool
    last_updated: str


class LiveRaceSummary(BaseModel):
    race_type: str
    total_dem_votes: int
    total_rep_votes: int
    total_other_votes: int
    total_votes: int
    wards_reporting: int
    total_wards: int
    pct_reporting: float
    dem_pct: float
    rep_pct: float
    margin: float


class LiveResultsResponse(BaseModel):
    election: LiveElectionResponse
    races: list[LiveRaceSummary]
    ward_results: dict[str, LiveWardResult]
    last_poll: str


@router.get("/elections", response_model=list[LiveElectionResponse])
async def get_live_elections(
    db: AsyncSession = Depends(get_db),
) -> list[LiveElectionResponse]:
    """List all election night sessions (active and past)."""
    q = select(LiveElection).order_by(LiveElection.election_date.desc())
    result = await db.execute(q)
    elections = result.scalars().all()

    return [
        LiveElectionResponse(
            election_date=e.election_date,
            election_name=e.election_name,
            is_active=e.is_active,
            total_wards=e.total_wards,
            wards_reporting=e.wards_reporting,
            pct_reporting=round(e.wards_reporting / e.total_wards * 100, 1) if e.total_wards > 0 else 0,
            last_updated=e.last_updated.isoformat() if isinstance(e.last_updated, datetime) else str(e.last_updated),
        )
        for e in elections
    ]


@router.get("/results/{election_date}", response_model=LiveResultsResponse)
async def get_live_results(
    election_date: str,
    race_type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> LiveResultsResponse:
    """Get current live results for an election night."""
    # Get election info
    eq = select(LiveElection).where(LiveElection.election_date == election_date)
    election = (await eq.execute(eq) if False else (await db.execute(eq))).scalar_one_or_none()

    if not election:
        return LiveResultsResponse(
            election=LiveElectionResponse(
                election_date=election_date,
                election_name=f"Election {election_date}",
                is_active=False,
                total_wards=0,
                wards_reporting=0,
                pct_reporting=0,
                last_updated=datetime.now().isoformat(),
            ),
            races=[],
            ward_results={},
            last_poll=datetime.now().isoformat(),
        )

    # Get ward-level results
    rq = select(LiveResult).where(LiveResult.election_date == election_date)
    if race_type:
        rq = rq.where(LiveResult.race_type == race_type)
    result = await db.execute(rq)
    results = result.scalars().all()

    # Build ward results map
    ward_results: dict[str, LiveWardResult] = {}
    for r in results:
        ward_results[r.ward_id] = LiveWardResult(
            ward_id=r.ward_id,
            dem_votes=r.dem_votes,
            rep_votes=r.rep_votes,
            other_votes=r.other_votes,
            total_votes=r.total_votes,
            pct_reporting=r.pct_reporting,
            is_final=r.is_final,
            last_updated=r.last_updated.isoformat() if isinstance(r.last_updated, datetime) else str(r.last_updated),
        )

    # Build race summaries
    race_agg: dict[str, dict] = {}
    for r in results:
        if r.race_type not in race_agg:
            race_agg[r.race_type] = {
                "dem": 0, "rep": 0, "other": 0, "total": 0,
                "reporting": 0, "total_wards": 0,
            }
        agg = race_agg[r.race_type]
        agg["dem"] += r.dem_votes
        agg["rep"] += r.rep_votes
        agg["other"] += r.other_votes
        agg["total"] += r.total_votes
        agg["total_wards"] += 1
        if r.pct_reporting > 0:
            agg["reporting"] += 1

    races = []
    for rt, agg in race_agg.items():
        total = agg["total"] or 1
        races.append(LiveRaceSummary(
            race_type=rt,
            total_dem_votes=agg["dem"],
            total_rep_votes=agg["rep"],
            total_other_votes=agg["other"],
            total_votes=agg["total"],
            wards_reporting=agg["reporting"],
            total_wards=agg["total_wards"],
            pct_reporting=round(agg["reporting"] / agg["total_wards"] * 100, 1) if agg["total_wards"] > 0 else 0,
            dem_pct=round(agg["dem"] / total * 100, 1),
            rep_pct=round(agg["rep"] / total * 100, 1),
            margin=round((agg["dem"] - agg["rep"]) / total * 100, 1),
        ))

    return LiveResultsResponse(
        election=LiveElectionResponse(
            election_date=election.election_date,
            election_name=election.election_name,
            is_active=election.is_active,
            total_wards=election.total_wards,
            wards_reporting=election.wards_reporting,
            pct_reporting=round(election.wards_reporting / election.total_wards * 100, 1) if election.total_wards > 0 else 0,
            last_updated=election.last_updated.isoformat() if isinstance(election.last_updated, datetime) else str(election.last_updated),
        ),
        races=races,
        ward_results=ward_results,
        last_poll=datetime.now().isoformat(),
    )
