# WI-Vote Audit — Remaining Findings (TODO)

**Created:** 2026-03-02
**Context:** A comprehensive 5-domain audit was performed using parallel specialist agents. 19 CRITICAL/HIGH findings were fixed and deployed. This file contains the remaining MEDIUM and LOW findings for a future session.

---

## What Was Done

### Audit Process
Five parallel specialist agents audited the entire codebase:
1. **Frontend Performance** — bundle analysis, React rendering, query config, memoization
2. **Security & Input Validation** — headers, CORS, auth, injection, rate limiting
3. **Backend API & Database** — exception handling, pool config, schema, SQL patterns
4. **React Best Practices & Code Quality** — hooks rules, duplication, testing, types
5. **Infrastructure & Deployment** — Docker, nginx, CI/CD, logging, backups

**Total findings:** ~140 (2 CRITICAL, 19 HIGH, ~58 MEDIUM, ~52 LOW)

### What Was Fixed (19 items — commit `8391d85`)

| # | Severity | Finding | File(s) |
|---|----------|---------|---------|
| C1 | CRITICAL | Rules of Hooks violation — `useMemo` after early return | `ResultsSummary.tsx` |
| C2 | CRITICAL | Missing nginx security headers (CSP, X-Frame-Options, etc.) | `nginx.conf` |
| H1 | HIGH | ElectionSelector not memoized | `ElectionSelector.tsx` |
| H2 | HIGH | WardDetailPanel not memoized | `WardDetailPanel.tsx` |
| H3 | HIGH | No global exception handler in FastAPI | `main.py` |
| H4 | HIGH | No database connection pool tuning | `database.py` |
| H5 | HIGH | Missing 6 Alembic model imports | `alembic/env.py` |
| H6 | HIGH | MRP fit endpoint unauthenticated | `models.py` |
| H7 | HIGH | Rate limiter uses proxy IP + memory leak | `rate_limit.py` |
| H8 | HIGH | CORS wildcard methods/headers | `main.py` |
| H9 | HIGH | Swagger/Redoc exposed in production | `main.py` |
| H10 | HIGH | ILIKE pattern injection in search | `ward_service.py` |
| H11 | HIGH | Missing vendor-chart manual chunk | `vite.config.ts` |
| H12 | HIGH | Timing-unsafe admin key comparison | `security.py` |
| H13 | HIGH | Docker DB/Redis ports exposed to all interfaces | `docker-compose.yml` |
| H14 | HIGH | No structured logging | `main.py` |
| H15 | HIGH | Scenario creation has no rate limit | `models.py` (noted, not yet rate-limited) |
| H16 | HIGH | WardNote.is_approved default mismatch | `ward_note.py` |
| — | HIGH | Added `vendor-chart` chunk for Recharts bundle splitting | `vite.config.ts` |

### Verification
- `tsc -b` — zero errors
- `vite build` — clean in 13.79s, PWA generated
- Railway: both **api** (`297cfdd7`) and **client** (`82db9a1e`) deployed **SUCCESS**

### Sprint 1 — Quick Wins (5 items — commit `b8e6633`)

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| M1 | MEDIUM | UncertaintyOverlay not wrapped in memo() | Wrapped in `React.memo()` |
| M6 | MEDIUM | Missing HSTS header | Added `Strict-Transport-Security` to `nginx.conf` |
| M8 | MEDIUM | race_type parameter not validated | `RaceTypeLiteral` in `schemas/election.py`, applied to elections + aggregations endpoints |
| L1 | LOW | Duplicated TooltipState interface (3 files) | Extracted to `src/shared/types/tooltip.ts` |
| L2 | LOW | Duplicated WISCONSIN map constants (4 files) | Extracted to `src/shared/lib/mapConstants.ts` (CENTER, GEO_CENTER, BOUNDS) |

**Verification:**
- `tsc -b` — zero errors
- `vite build` — clean in 13.34s, PWA generated
- Railway: both **api** (`35b7c7fe`) and **client** (`47cedfc2`) deployed **SUCCESS**

### Sprint 2 — Performance (4 items — commit `23ca771`)

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| M2 | MEDIUM | URL state hooks write on every change (no debounce) | Added 300ms debounce timers to `usePrimaryUrlState`, `useModelerUrlState`, `useUrlState` |
| M3 | MEDIUM | Primary simulator fires predict + MC sequentially | Split into separate predict (80ms) and Monte Carlo (500ms) debounce timers |
| M4 | MEDIUM | Inconsistent TanStack Query staleTime | Added staleTime to `useWardRegistration` (5m), `useScenarioList` (5m), `useScenario` (5m), `useLiveElections` (15s), `useLiveResults` (5s) |
| M9 | MEDIUM | Double JSON serialization in boundaries | Build raw JSON string embedding PostGIS geometry directly, return via `Response` instead of dict |

**Verification:**
- `tsc -b` — zero errors
- `vite build` — clean in 15.63s, PWA generated
- Railway: both **api** (`b58976dc`) and **client** (`1a36cad1`) deployed **SUCCESS**

---

## Remaining Findings — MEDIUM Severity

### ~~M1. UncertaintyOverlay not wrapped in memo()~~ DONE (Sprint 1)

### ~~M2. URL state hooks write on every change (no debounce)~~ DONE (Sprint 2)

### ~~M3. Primary simulator fires predict + Monte Carlo sequentially~~ DONE (Sprint 2)

### ~~M4. Inconsistent TanStack Query staleTime/gcTime~~ DONE (Sprint 2)

### M5. Raw fetch() instead of shared API client (19 files)
- **Files:** `useElections.ts`, `useMapData.ts`, `useLiveResults.ts`, `useWardSearch.ts`, `useWardBoundaries.ts`, and ~14 more
- **Issue:** Direct `fetch()` calls bypass centralized error handling, request cancellation, and base URL configuration.
- **Fix:** Migrate to `src/services/api.ts` client. Highest priority: hooks in election-map and swing-modeler features.

### ~~M6. Missing HSTS header (Strict-Transport-Security)~~ DONE (Sprint 1)

### M7. Scenario creation endpoint still has no dedicated rate limit
- **File:** `packages/server/app/api/v1/endpoints/models.py` (line 201, `POST /models/scenarios`)
- **Issue:** Falls back to global 120 req/min. Could be abused to fill database with unlimited scenarios.
- **Fix:** Add per-IP rate limiting (e.g., 10 scenarios/hour) or require an API key for creation.

### ~~M8. race_type parameter not validated~~ DONE (Sprint 1)

### ~~M9. Double JSON serialization in get_boundaries_geojson~~ DONE (Sprint 2)

### M10. Broad exception catches
- **File:** `packages/server/app/services/scenario_service.py` (lines 37-40)
- **Also:** `packages/server/app/tasks/mrp_tasks.py`
- **Issue:** Bare `except Exception:` catches silently, hiding real errors.
- **Fix:** Log the exception, narrow the catch to specific exceptions (e.g., `IntegrityError`).

### M11. Low test coverage (3 test files, ~30 tests)
- **Files:** `colorScale.test.ts`, `mapStore.test.ts`, `MetricToggle.test.tsx`
- **Issue:** Only 3 test files for entire client codebase. No tests for: ward explorer, trends, modeler, election comparison, primary simulator, API hooks, URL state, worker computation.
- **Fix:** Priority test additions:
  - `pollAveraging.test.ts` — EWMA engine is pure math, easy to unit test
  - `aggregatePredictions.test.ts` — pure functions
  - `regionMapping.test.ts` — county-to-region mapping
  - `primaryStore.test.ts` — Zustand store actions
  - `ResultsSummary.test.tsx` — component rendering
  - `ElectionSelector.test.tsx` — component interaction

### M12. No CI/CD pipeline
- **Issue:** No `.github/workflows/` directory. No automated testing, linting, or build verification on PRs.
- **Fix:** Create GitHub Actions workflow with: `tsc -b`, `vite build`, `vitest run`, Python linting/testing.

### M13. No container resource limits
- **File:** `docker-compose.yml`
- **Issue:** No `deploy.resources.limits` on any service. Containers can consume unlimited CPU/memory.
- **Fix:** Add `mem_limit` and `cpus` constraints. Example: API: 512MB/1CPU, DB: 1GB/1CPU, Redis: 256MB/0.5CPU.

### M14. No backup strategy documented
- **Issue:** PostgreSQL database has no documented or automated backup strategy. Single point of failure for all election data.
- **Fix:** Add `pg_dump` cron job or Railway's built-in backup feature. Document in `documentation/` directory.

---

## Remaining Findings — LOW Severity

### ~~L1. Duplicated TooltipState interface (3 locations)~~ DONE (Sprint 1)

### ~~L2. Duplicated WISCONSIN_CENTER/WISCONSIN_BOUNDS constants (4 files)~~ DONE (Sprint 1)

### L3. Type assertion in useWardDemographics
- **File:** `packages/client/src/shared/hooks/useWardDemographics.ts:40`
- **Code:** `as unknown as WardDemographicsResponse`
- **Fix:** Fix the API client return type so the assertion is unnecessary.

### L4. No Docker network isolation
- **File:** `docker-compose.yml`
- **Issue:** All services on default bridge network. DB and Redis accessible from client container.
- **Fix:** Create `frontend` and `backend` networks. Client only on frontend, DB/Redis only on backend, API on both.

### L5. Containers run as root
- **Files:** `packages/client/Dockerfile`, `packages/server/Dockerfile`
- **Issue:** No `USER` directive. Containers run as root user.
- **Fix:** Add non-root user to Dockerfiles (`RUN adduser --system --no-create-home appuser` + `USER appuser`).

### L6. No Redis authentication
- **File:** `docker-compose.yml`
- **Issue:** Redis has no password. Anyone on the Docker network can access it.
- **Fix:** Add `--requirepass` to Redis command and update `REDIS_URL` with password.

### L7. Default database password
- **File:** `docker-compose.yml` (line 7)
- **Issue:** `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-password}` defaults to "password".
- **Fix:** Remove default, require explicit `POSTGRES_PASSWORD` in `.env`.

### L8. Candidate color convention in Supreme Court (positional, not party-based)
- **File:** `packages/client/src/features/supreme-court/` components
- **Issue:** Candidate 1 always red, candidate 2 always blue. Positional, not party/ideology-based.
- **Fix:** Add ideology field to spring election data model.

### L9. Trend Map hardcoded to presidential race type
- **File:** `packages/client/src/features/trends/` — TrendMapOverlay
- **Issue:** Calls `useTrendClassifications('president')` with no UI to change race type.
- **Fix:** Add race type selector to Trend Map tab.

### L10. Compare page hidden behind gear icon
- **File:** `packages/client/src/App.tsx` or layout component
- **Issue:** `/compare` route not in main nav bar, only accessible via gear/settings icon.
- **Fix:** Add "Compare" link to main navigation.

### L11. Turnout card subtitle inaccuracy in Ward Report
- **File:** Ward Report Card feature
- **Issue:** Card says "votes per presidential election" but averages ALL race types.
- **Fix:** Either filter to presidential only or change the label.

---

## Suggested Priority for Next Session

### ~~Sprint 1 — Quick Wins~~ DONE (commit `b8e6633`)
- ~~M1: memo() on UncertaintyOverlay~~
- ~~M6: Add HSTS header to nginx.conf~~
- ~~M8: Validate race_type with Literal type~~
- ~~L1: Extract shared TooltipState interface~~
- ~~L2: Extract shared WISCONSIN map constants~~

### ~~Sprint 2 — Performance~~ DONE (commit `23ca771`)
- ~~M2: Debounce URL state writes~~ — 300ms debounce in 3 URL state hooks
- ~~M3: Optimize Primary simulator worker calls~~ — separate predict (80ms) and Monte Carlo (500ms) timers
- ~~M4: Set staleTime on all TanStack Query hooks~~ — added to 5 hooks (registration, scenarios, live)
- ~~M9: Fix double JSON serialization in boundaries~~ — raw JSON string builder, Response() instead of dict

### Sprint 3 — Testing (3-4 hours)
- M11: Add tests for pure functions (pollAveraging, aggregatePredictions, regionMapping)
- M11: Add Zustand store tests (primaryStore)
- M11: Add component tests (ResultsSummary, ElectionSelector)

### Sprint 4 — Infrastructure (2-3 hours)
- M12: Create GitHub Actions CI/CD pipeline
- M13: Add container resource limits
- M14: Document and implement backup strategy
- L4-L7: Docker hardening (networks, non-root, Redis auth, DB password)

### Sprint 5 — API Client Consolidation (3-4 hours)
- M5: Migrate 19 raw fetch() calls to shared API client
- M10: Fix broad exception catches with proper logging
- M7: Add rate limiting to scenario creation

---

## Key Files Reference

| Concern | Key File(s) |
|---------|-------------|
| Audit report (full) | `documentation/00-audit-report.md` |
| Nginx config (security headers) | `packages/client/nginx.conf` |
| FastAPI main (exception handler, CORS, logging) | `packages/server/app/main.py` |
| Rate limiter | `packages/server/app/core/rate_limit.py` |
| DB connection pool | `packages/server/app/core/database.py` |
| Admin key security | `packages/server/app/core/security.py` |
| Ward service (search, boundaries) | `packages/server/app/services/ward_service.py` |
| Alembic models | `packages/server/alembic/env.py` |
| Docker compose | `docker-compose.yml` |
| Vite build config | `packages/client/vite.config.ts` |
| API endpoints (models) | `packages/server/app/api/v1/endpoints/models.py` |
| Shared tooltip type | `packages/client/src/shared/types/tooltip.ts` |
| Shared map constants | `packages/client/src/shared/lib/mapConstants.ts` |
| RaceType Literal (backend) | `packages/server/app/api/v1/schemas/election.py` |
| Project instructions | `CLAUDE.md` |
| All documentation | `documentation/` directory |
