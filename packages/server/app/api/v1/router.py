from fastapi import APIRouter

from app.api.v1.endpoints import wards, elections, trends, aggregations, models, spring_elections, demographics

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(wards.router)
api_router.include_router(elections.router)
api_router.include_router(spring_elections.router)
api_router.include_router(trends.router)
api_router.include_router(aggregations.router)
api_router.include_router(models.router)
api_router.include_router(demographics.router)
