# March 2026 Comprehensive Audit Fixes

**Date:** 2026-03-22
**Scope:** Security, API robustness, dark mode, accessibility, mobile UX, DB performance, code quality, testing

---

## Issues Fixed (21 total)

### HIGH Priority

| # | Category | Issue | Files Changed | Status |
|---|----------|-------|---------------|--------|
| 1 | Security | Analytics dashboard used query string auth (`?key=`) — exposed token in logs/referrer. Moved to `X-Admin-Analytics-Key` header | `server/app/api/v1/endpoints/analytics.py`, `server/app/main.py`, `client/src/features/analytics-dashboard/hooks/useAnalyticsDashboard.ts` | FIXED |
| 2 | Testing | Zero backend test files — added 6 new test files with ~25 tests covering analytics, ward notes, demographics, trends, report card | `server/tests/test_analytics.py`, `test_ward_notes.py`, `test_demographics.py`, `test_trends.py`, `test_report_card.py` | FIXED |
| 3 | Dark mode | Hardcoded colors: `#9ca3af` (CandidateCard dot), `#cccccc` (WardTooltip border), `text-amber-600` (estimate text). Replaced with `hsl(var(--muted-foreground))`, `hsl(var(--border))`, `text-amber-600 dark:text-amber-400` | `client/src/features/primary-simulator/components/CandidateCard.tsx`, `client/src/features/election-map/components/WardTooltip.tsx` | FIXED |
| 4 | A11y | OfflineIndicator used `role="alert"` but conditionally rendered — screen readers never saw it. Wrapped in always-present `aria-live="polite"` container with `role="status"` | `client/src/shared/components/OfflineIndicator.tsx` | FIXED |
| 5 | API | Bulk demographics endpoint had no pagination. Added `limit`/`offset` query params with total count | `server/app/api/v1/endpoints/demographics.py`, `server/app/services/demographic_service.py` | FIXED |
| 6 | API | Geocoding service didn't catch httpx exceptions — returned 500. Added try/except for HTTPError and TimeoutException | `server/app/services/geocoding_service.py` | FIXED |
| 7 | Config | `ADMIN_API_KEY` defaulted to empty string with no warning. Added startup log warnings when keys are empty in non-debug mode | `server/app/main.py` | FIXED |

### MEDIUM Priority

| # | Category | Issue | Files Changed | Status |
|---|----------|-------|---------------|--------|
| 8 | Mobile | Range sliders cramped on 375px — label=96px + value=48px left ~150px for slider. Made widths responsive: `w-20 sm:w-24`, `w-8 sm:w-12` | `client/src/features/primary-simulator/components/CandidateCard.tsx` | FIXED |
| 9 | Mobile | WardTooltip completely hidden on mobile (`hidden md:block`). Added mobile-only fixed bottom bar + extracted shared TooltipContent helper | `client/src/features/election-map/components/WardTooltip.tsx` | FIXED |
| 10 | A11y | CandidateCard accordion button missing focus-visible ring. Added `focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none` | `client/src/features/primary-simulator/components/CandidateCard.tsx` | FIXED |
| 11 | DB | Missing composite indexes for common query patterns. Added `idx_results_race_type` and `idx_results_ward_race_year` | `server/app/models/election_result.py` | FIXED |
| 12 | API | Ward notes endpoint didn't validate ward_id exists. Added existence check before insert, returns 404 | `server/app/api/v1/endpoints/ward_notes.py` | FIXED |
| 13 | Perf | Report card made 2 separate COUNT queries for percentile. Combined into single query with `.filter()` aggregate | `server/app/services/report_card_service.py` | FIXED |
| 14 | Code | `useMemo` used for side effects (calling `setYear`/`setRaceType`). Converted to `useEffect` | `client/src/features/turnout-gaps/index.tsx` | FIXED |
| 15 | API | Inconsistent response formats across bulk endpoints. Created shared `PaginatedResponse` schema, adopted in demographics | `server/app/api/v1/schemas.py` (new) | FIXED |

### LOW Priority

| # | Category | Issue | Files Changed | Status |
|---|----------|-------|---------------|--------|
| 16 | Charts | Analytics DEVICE_COLORS used hardcoded hex for icons. Replaced inline styles with Tailwind classes (`text-indigo-500`, `text-amber-500`, `text-emerald-500`) | `client/src/features/analytics-dashboard/index.tsx` | FIXED |
| 17 | UX | No loading skeletons for analytics charts. Added chart skeleton cards during loading state | `client/src/features/analytics-dashboard/index.tsx` | FIXED |
| 18 | Code | Duplicated field serialization across services. Extracted `serialize_election()` + `serialize_ward_meta()` to shared module, adopted in report_card_service | `server/app/services/serializers.py` (new), `server/app/services/report_card_service.py` | FIXED |
| 19 | Ops | No structured logging in service layer. Added `logger = logging.getLogger(__name__)` to geocoding, report_card, election, trend services | `server/app/services/geocoding_service.py`, `report_card_service.py`, `election_service.py`, `trend_service.py` | FIXED |
| 20 | API | Silent truncation at 500 ward_ids. Now returns 400 with error message | `server/app/api/v1/endpoints/trends.py` | FIXED |
| 21 | Git | `_/`, `tmp/`, `ui-ux-pro-max-skill/` untracked. Added to .gitignore | `.gitignore` | FIXED |

---

## New Files Created

| File | Purpose |
|------|---------|
| `server/app/api/v1/schemas.py` | Shared `PaginatedResponse` base model for consistent API pagination |
| `server/app/services/serializers.py` | Shared `serialize_election()` + `serialize_ward_meta()` utilities |
| `server/tests/test_analytics.py` | Analytics endpoint tests (header auth, event ingestion) |
| `server/tests/test_ward_notes.py` | Ward notes CRUD, validation, admin key tests |
| `server/tests/test_demographics.py` | Demographics pagination, 404, summary tests |
| `server/tests/test_trends.py` | Trends, bulk elections 400, volatility, classify tests |
| `server/tests/test_report_card.py` | Report card 404 and structure tests |

---

## Migration Required

After deploying, run Alembic migration to create the two new database indexes:
- `idx_results_race_type` on `election_results(race_type)`
- `idx_results_ward_race_year` on `election_results(ward_id, race_type, election_year)`
