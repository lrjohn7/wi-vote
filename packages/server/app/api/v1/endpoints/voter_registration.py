from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.voter_registration import VoterRegistration

router = APIRouter(prefix="/voter-registration", tags=["voter-registration"])


class WardRegistrationResponse(BaseModel):
    ward_id: str
    snapshot_date: str
    total_registered: int
    active_registered: int
    inactive_registered: int
    registration_rate: float | None

    model_config = {"from_attributes": True}


class RegistrationMapResponse(BaseModel):
    snapshot_date: str
    ward_count: int
    data: dict[str, WardRegistrationResponse]


class RegistrationSummaryResponse(BaseModel):
    snapshot_date: str
    total_wards: int
    total_registered: int
    avg_registration_rate: float | None


@router.get("/ward/{ward_id}", response_model=list[WardRegistrationResponse])
async def get_ward_registration(
    ward_id: str,
    db: AsyncSession = Depends(get_db),
) -> list[WardRegistrationResponse]:
    """Get voter registration history for a specific ward."""
    q = (
        select(VoterRegistration)
        .where(VoterRegistration.ward_id == ward_id)
        .order_by(VoterRegistration.snapshot_date.desc())
    )
    result = await db.execute(q)
    regs = result.scalars().all()

    return [
        WardRegistrationResponse(
            ward_id=r.ward_id,
            snapshot_date=r.snapshot_date,
            total_registered=r.total_registered,
            active_registered=r.active_registered,
            inactive_registered=r.inactive_registered,
            registration_rate=r.registration_rate,
        )
        for r in regs
    ]


@router.get("/map-data", response_model=RegistrationMapResponse)
async def get_registration_map_data(
    snapshot_date: str | None = Query(None, description="Specific snapshot date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
) -> RegistrationMapResponse:
    """Get voter registration data for all wards as map data."""
    if snapshot_date:
        date_filter = VoterRegistration.snapshot_date == snapshot_date
    else:
        # Get most recent snapshot
        latest_q = select(func.max(VoterRegistration.snapshot_date))
        latest_date = (await db.execute(latest_q)).scalar()
        if not latest_date:
            return RegistrationMapResponse(snapshot_date="", ward_count=0, data={})
        date_filter = VoterRegistration.snapshot_date == latest_date
        snapshot_date = latest_date

    q = select(VoterRegistration).where(date_filter)
    result = await db.execute(q)
    regs = result.scalars().all()

    data = {}
    for r in regs:
        data[r.ward_id] = WardRegistrationResponse(
            ward_id=r.ward_id,
            snapshot_date=r.snapshot_date,
            total_registered=r.total_registered,
            active_registered=r.active_registered,
            inactive_registered=r.inactive_registered,
            registration_rate=r.registration_rate,
        )

    return RegistrationMapResponse(
        snapshot_date=snapshot_date,
        ward_count=len(data),
        data=data,
    )


@router.get("/summary", response_model=RegistrationSummaryResponse)
async def get_registration_summary(
    snapshot_date: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> RegistrationSummaryResponse:
    """Get aggregate registration statistics."""
    if not snapshot_date:
        latest_q = select(func.max(VoterRegistration.snapshot_date))
        snapshot_date = (await db.execute(latest_q)).scalar() or ""

    q = select(
        func.count(VoterRegistration.id),
        func.sum(VoterRegistration.total_registered),
        func.avg(VoterRegistration.registration_rate),
    ).where(VoterRegistration.snapshot_date == snapshot_date)

    result = await db.execute(q)
    row = result.one()

    return RegistrationSummaryResponse(
        snapshot_date=snapshot_date,
        total_wards=row[0] or 0,
        total_registered=row[1] or 0,
        avg_registration_rate=round(row[2], 2) if row[2] else None,
    )
