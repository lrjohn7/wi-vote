from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.demographic_service import DemographicService

router = APIRouter(prefix="/demographics", tags=["demographics"])


@router.get("/ward/{ward_id}")
async def get_ward_demographics(
    ward_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get demographic data for a single ward."""
    service = DemographicService(db)
    result = await service.get_ward_demographics(ward_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"No demographics for ward {ward_id}")
    return result


@router.get("/bulk")
async def get_bulk_demographics(
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get demographics for all wards as a compact dictionary."""
    service = DemographicService(db)
    data = await service.get_bulk_demographics()
    return {"ward_count": len(data), "demographics": data}


@router.get("/summary")
async def get_demographics_summary(
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get summary counts by urban/suburban/rural classification."""
    service = DemographicService(db)
    return await service.get_urban_rural_counts()
