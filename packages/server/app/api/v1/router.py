from fastapi import APIRouter

from app.api.v1.endpoints import (
    wards, elections, trends, aggregations, models, spring_elections,
    demographics, ward_notes, voter_registration, live_results, analytics,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(wards.router)
api_router.include_router(elections.router)
api_router.include_router(spring_elections.router)
api_router.include_router(trends.router)
api_router.include_router(aggregations.router)
api_router.include_router(models.router)
api_router.include_router(demographics.router)
api_router.include_router(ward_notes.router)
api_router.include_router(voter_registration.router)
api_router.include_router(live_results.router)
api_router.include_router(analytics.router)
