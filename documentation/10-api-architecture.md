# 10 — API Architecture

> FastAPI backend with PostGIS, service layer pattern, and async SQLAlchemy.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | FastAPI (async) |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| ORM | SQLAlchemy 2.0 (async) + GeoAlchemy2 |
| Validation | Pydantic v2 |
| Serialization | ORJSON (via ORJSONResponse) |
| Compression | GZip middleware (min 1000 bytes) |
| CORS | Configurable via `API_CORS_ORIGINS` env var |
| Task queue | Celery + Redis (for MRP fitting) |
| Migrations | Alembic |

---

## Endpoint Summary

### Wards (`/api/v1/wards`)

| Method | Path | Description | Cache |
|--------|------|-------------|-------|
| GET | `/` | List wards (paginated, filterable by county/municipality/vintage) | — |
| GET | `/boundaries` | GeoJSON FeatureCollection of all ward polygons | 7 day |
| GET | `/geocode?lat=X&lng=X&address=X` | Find ward at coordinates or geocode address | — |
| GET | `/search?q=X&limit=20` | Full-text search on ward name/municipality/county | — |
| GET | `/{ward_id}/report-card?race_type=president` | Full report card with lean, trend, comparisons | — |
| GET | `/{ward_id}` | Single ward with all election results | — |

### Elections (`/api/v1/elections`)

| Method | Path | Description | Cache |
|--------|------|-------------|-------|
| GET | `/` | List available year + race type combinations | 1 hour |
| GET | `/{year}/{race_type}` | Paginated ward results for an election | — |
| GET | `/map-data/{year}/{race_type}` | Compact dict for `setFeatureState` rendering | 24 hour |

### Trends (`/api/v1/trends`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/ward/{ward_id}` | Trend data for a single ward |
| GET | `/area?county=X&district_type=X&district_id=X` | Aggregated area trends |
| POST | `/bulk-elections` | Election histories for multiple wards (max 500) |
| GET | `/classify?race_type=president` | Bulk trend classification for all wards |

### Aggregations (`/api/v1/aggregations`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/county/{county}/{year}/{race_type}` | County-level aggregation |
| GET | `/district/{type}/{id}/{year}/{race_type}` | District-level aggregation |
| GET | `/statewide/{year}/{race_type}` | Statewide aggregation |

### Spring Elections (`/api/v1/spring-elections`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List available spring contests |
| GET | `/{year}` | Paginated reporting-unit results |
| GET | `/{year}/counties` | County-level spring summary |

### Demographics (`/api/v1/demographics`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/ward/{ward_id}` | Single ward demographics |
| GET | `/bulk` | All wards as compact dict |
| GET | `/summary` | Urban/suburban/rural counts |

### Models (`/api/v1/models`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/available` | List models with metadata |
| POST | `/predict` | Run MRP prediction (client models use Web Worker) |
| POST | `/mrp/fit` | Trigger async MRP fitting (Celery) |
| GET | `/mrp/fit/{task_id}` | Poll fitting status |
| GET | `/mrp/fitted` | List pre-fitted MRP models |
| POST | `/scenarios` | Save scenario (stub) |
| GET | `/scenarios/{id}` | Load scenario (stub) |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Returns `{ status: "healthy", version }` |

---

## Service Layer Pattern

Each router delegates to a service class that encapsulates business logic:

| Router | Service | Key Methods |
|--------|---------|-------------|
| `wards.py` | `WardService` | `get_all`, `get_by_id`, `search`, `geocode`, `get_boundaries_geojson` |
| `wards.py` | `GeocodingService` | `geocode_address`, `find_ward_at_point` |
| `wards.py` | `ReportCardService` | `get_report_card` |
| `elections.py` | `ElectionService` | `list_elections`, `get_results`, `get_map_data` |
| `trends.py` | `TrendService` | `get_ward_trend`, `get_area_trends`, `classify_all`, `get_bulk_elections` |
| `aggregations.py` | `AggregationService` | `get_county`, `get_district`, `get_statewide` |
| `spring_elections.py` | `SpringElectionService` | `list_contests`, `get_results`, `get_county_summary` |
| `demographics.py` | `DemographicService` | `get_ward_demographics`, `get_bulk_demographics`, `get_urban_rural_counts` |
| `models.py` | `MrpService` | `predict`, `get_fitted_models`, `get_fit_status` |

Services receive an `AsyncSession` via FastAPI dependency injection (`Depends(get_db)`).

---

## Geocoding Flow

1. Client sends address string to `GET /wards/geocode?address=...`
2. `GeocodingService.geocode_address()` calls US Census Geocoder API
3. Census API returns matched address + lat/lng coordinates
4. Service checks `state == "WI"` — returns 400 if not Wisconsin
5. `WardService.geocode(lat, lng)` runs PostGIS `ST_Contains` query
6. Returns ward record + coordinates, or 404 if no ward at that point

---

## Database Models

| SQLAlchemy Model | Table | Key Columns |
|-----------------|-------|-------------|
| `Ward` | `wards` | ward_id, ward_name, municipality, county, geom (MultiPolygon), ward_vintage, partisan_lean |
| `ElectionResult` | `election_results` | ward_id, election_year, race_type, dem/rep/other/total votes, is_estimate |
| `WardTrend` | `ward_trends` | ward_id, race_type, direction, slope, p_value |
| `ElectionAggregation` | `election_aggregations` | level (county/statewide), key, year, race_type, margin |
| `WardDemographic` | `ward_demographics` | ward_id, population, race/ethnicity, education, income, urban_rural_class |

---

## Security Notes

- **No authentication** on any endpoint. See audit item #81.
- **No rate limiting.** See audit item #82.
- **MRP fit endpoint** (`POST /models/mrp/fit`) can trigger expensive computation — needs gating.
- **Geocoding proxies** to Census API which has its own rate limits.

---

## Files

| File | Purpose |
|------|---------|
| `server/app/main.py` | FastAPI app setup, middleware, router inclusion |
| `server/app/api/v1/router.py` | Aggregates all endpoint routers |
| `server/app/api/v1/endpoints/*.py` | Individual endpoint routers |
| `server/app/services/*.py` | Business logic services |
| `server/app/models/*.py` | SQLAlchemy ORM models |
| `server/app/core/config.py` | Settings (env vars) |
| `server/app/core/database.py` | AsyncSession factory + `get_db` dependency |
