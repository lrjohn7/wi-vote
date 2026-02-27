from fastapi import APIRouter

from app.api.v1.endpoints import wards, elections, trends, aggregations, models

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(wards.router)
api_router.include_router(elections.router)
api_router.include_router(trends.router)
api_router.include_router(aggregations.router)
api_router.include_router(models.router)
