# WI-Vote Comprehensive Audit Report

**Date:** 2026-03-02
**Audited by:** 5 parallel specialist agents (Frontend Performance, Security, Backend API, React Best Practices, Infrastructure)
**Total findings:** ~140 across all categories

---

## Severity Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 2 | Fix immediately |
| HIGH | 19 | Fix in this sprint |
| MEDIUM | 58 | Fix next sprint |
| LOW | 52 | Backlog |

---

## CRITICAL Findings

### C1. Rules of Hooks Violation — `ResultsSummary.tsx`
- **File:** `src/features/swing-modeler/components/ResultsSummary.tsx`
- **Issue:** `useMemo` called after early `return` on lines 108-114. React hooks must be called unconditionally before any early returns. The eslint-disable comments mask the violation.
- **Impact:** Potential runtime crash or inconsistent state in production.
- **Fix:** Move all `useMemo` calls above the early return guard.

### C2. Missing Nginx Security Headers
- **File:** `packages/client/nginx.conf`
- **Issue:** No CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, or Permissions-Policy headers. No `server_tokens off`.
- **Impact:** Vulnerable to XSS, clickjacking, MIME sniffing, and other client-side attacks.
- **Fix:** Add comprehensive security headers block at server level.

---

## HIGH Findings

### H1. ElectionSelector not memoized
- **File:** `src/features/election-map/components/ElectionSelector.tsx`
- **Issue:** Recomputes `years` and `racesForYear` arrays on every parent render (e.g., map hover).
- **Fix:** Wrap in `memo()`, memoize computed arrays.

### H2. WardDetailPanel not memoized
- **File:** `src/features/election-map/components/WardDetailPanel.tsx`
- **Issue:** Expensive panel with election history cards re-renders on every map hover.
- **Fix:** Wrap in `memo()`.

### H3. No global exception handler — FastAPI
- **File:** `packages/server/app/main.py`
- **Issue:** Unhandled exceptions return raw 500 with stack traces. No structured logging.
- **Fix:** Add `@app.exception_handler(Exception)` that returns safe JSON error + logs.

### H4. No database connection pool tuning
- **File:** `packages/server/app/core/database.py`
- **Issue:** Default `pool_size=5`, no `pool_pre_ping`, no `pool_recycle`.
- **Fix:** Configure pool with `pool_size=10`, `pool_pre_ping=True`, `pool_recycle=3600`.

### H5. Missing Alembic model imports
- **File:** `packages/server/alembic/env.py`
- **Issue:** Missing 6 models: `Scenario`, `WardNote`, `VoterRegistration`, `LiveResult`, `LiveElection`, `AnalyticsEvent`.
- **Fix:** Import all models from `app.models`.

### H6. MRP fit endpoint has no authentication
- **File:** `packages/server/app/api/v1/endpoints/models.py`
- **Issue:** `POST /models/mrp/fit` triggers expensive Celery tasks with no auth check.
- **Fix:** Add `Depends(verify_admin_key)` to the endpoint.

### H7. Rate limiter uses wrong client IP + memory leak
- **File:** `packages/server/app/core/rate_limit.py`
- **Issue:** `request.client.host` returns nginx proxy IP, not real client. `_counters` dict grows unbounded.
- **Fix:** Read `X-Forwarded-For`/`X-Real-IP` header. Add periodic counter cleanup.

### H8. CORS overly permissive
- **File:** `packages/server/app/main.py`
- **Issue:** `allow_methods=["*"]`, `allow_headers=["*"]` exposes all HTTP methods.
- **Fix:** Restrict to `["GET", "POST", "OPTIONS"]` and specific headers.

### H9. FastAPI docs exposed in production
- **File:** `packages/server/app/main.py`
- **Issue:** Swagger UI at `/docs` and `/redoc` accessible in production.
- **Fix:** Set `docs_url=None`, `redoc_url=None` when not in debug mode.

### H10. ILIKE pattern injection
- **File:** `packages/server/app/services/ward_service.py`
- **Issue:** Search query `%`, `_` characters not escaped, enabling SQL wildcard injection.
- **Fix:** Escape special LIKE characters in search input.

### H11. Missing `vendor-chart` manual chunk
- **File:** `packages/client/vite.config.ts`
- **Issue:** Recharts bundled into main chunk (~200KB). Should be separate for lazy loading.
- **Fix:** Add `'vendor-chart': ['recharts']` to `manualChunks`.

### H12. Timing-unsafe admin key comparison
- **File:** `packages/server/app/core/security.py`
- **Issue:** `!=` operator enables timing side-channel attack on admin key.
- **Fix:** Use `hmac.compare_digest()`.

### H13. Docker DB/Redis ports exposed
- **File:** `docker-compose.yml`
- **Issue:** Ports 5432 and 6379 bound to `0.0.0.0`, accessible from any network interface.
- **Fix:** Bind to `127.0.0.1` for local dev only.

### H14. No structured logging
- **File:** `packages/server/app/main.py`
- **Issue:** No logging configuration. Uses default Python logging which loses context.
- **Fix:** Configure structured JSON logging with request context.

### H15. Scenario creation has no rate limit
- **File:** `packages/server/app/api/v1/endpoints/models.py`
- **Issue:** `POST /models/scenarios` allows anyone to create unlimited scenarios (storage DoS).
- **Fix:** Add per-IP rate limiting.

### H16. WardNote.is_approved default mismatch
- **File:** `packages/server/app/models/ward_note.py`
- **Issue:** Model default `True` but endpoint forces `False`. If note created outside API, it's auto-approved.
- **Fix:** Set model default to `False`.

---

## Implementation Priority

### Phase 1 — Critical (implement now)
1. C1: Fix Rules of Hooks in ResultsSummary.tsx
2. C2: Add nginx security headers

### Phase 2 — High Security
3. H3: Global exception handler
4. H6: Auth on MRP fit endpoint
5. H7: Fix rate limiter IP + memory leak
6. H8: Restrict CORS methods
7. H9: Disable docs in production
8. H10: Escape ILIKE patterns
9. H12: Timing-safe admin key comparison

### Phase 3 — High Performance
10. H1: Memoize ElectionSelector
11. H2: Memoize WardDetailPanel
12. H4: Database connection pool tuning
13. H11: Add vendor-chart manual chunk

### Phase 4 — High Infrastructure
14. H5: Fix Alembic model imports
15. H13: Restrict Docker ports
16. H14: Structured logging
17. H15: Rate limit scenario creation
18. H16: Fix WardNote default

---

## MEDIUM and LOW findings are tracked in internal audit notes and will be addressed in subsequent sprints.
