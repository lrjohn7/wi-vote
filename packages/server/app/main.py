from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.core.config import settings
from app.core.rate_limit import RateLimitMiddleware
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    # Startup
    yield
    # Shutdown


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

# Rate limiting — 120 req/min default, 30 req/min for expensive endpoints
app.add_middleware(
    RateLimitMiddleware,
    max_requests=120,
    window_seconds=60,
    expensive_paths=["/api/v1/wards/boundaries", "/api/v1/elections/map-data"],
)

# GZip compression — biggest win for boundaries GeoJSON (~25MB → ~3MB)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.api_cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(api_router)


@app.get("/health")
async def health_check() -> dict:
    return {"status": "healthy", "version": settings.app_version}
