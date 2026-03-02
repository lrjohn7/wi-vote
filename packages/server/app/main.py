import logging
import sys
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.rate_limit import RateLimitMiddleware
from app.api.v1.router import api_router

# ── Structured logging ──────────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger("wivote")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    # Startup
    logger.info("WI-Vote API starting (version %s, debug=%s)", settings.app_version, settings.debug)
    yield
    # Shutdown
    logger.info("WI-Vote API shutting down")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
    # Disable Swagger/Redoc in production to avoid information leakage
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)


# ── Global exception handler ────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch unhandled exceptions and return a safe JSON error instead of a stack trace."""
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# Rate limiting -- 120 req/min default, 30 req/min for expensive endpoints
app.add_middleware(
    RateLimitMiddleware,
    max_requests=120,
    window_seconds=60,
    expensive_paths=["/api/v1/wards/boundaries", "/api/v1/elections/map-data", "/api/v1/primary/map-data"],
)

# GZip compression -- biggest win for boundaries GeoJSON (~25MB -> ~3MB)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS — restrict methods and headers to only what the app uses
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.api_cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Admin-Key", "X-Requested-With"],
)

# Routes
app.include_router(api_router)


@app.get("/health")
async def health_check() -> dict:
    return {"status": "healthy", "version": settings.app_version}
