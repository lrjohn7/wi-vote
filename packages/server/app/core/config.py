from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = (
        "postgresql+asyncpg://postgres:password@localhost:5432/wivote"
    )

    # CORS
    api_cors_origins: str = "http://localhost:5173"

    # Geocoding
    census_geocoder_url: str = (
        "https://geocoding.geo.census.gov/geocoder"
    )

    # Redis / Celery
    redis_url: str = "redis://localhost:6379/0"

    # MRP model traces directory
    mrp_traces_dir: str = "/data/mrp_traces"

    # Admin
    admin_api_key: str = ""  # Set via ADMIN_API_KEY env var; required for destructive endpoints

    # App
    app_name: str = "WI-Vote API"
    app_version: str = "0.1.0"
    debug: bool = False

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
