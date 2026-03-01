# WI-Vote Audit Report

**Date:** 2026-02-28
**Auditor:** Claude Code (automated + manual browser audit)
**Environment:** Production (client-production-b36e.up.railway.app)
**Method:** Full page navigation, interaction testing, API endpoint testing, source code review

---

## Audit Summary

| Status | Count |
|--------|-------|
| PASS   | 34    |
| WARN   | 8     |
| FAIL   | 2     |
| TODO   | 7     |
| NEEDS GATING | 2 |

---

## Feature: Election Map (`/map`)

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Page loads with default election (2024 President) | **PASS** | 6,819 wards rendered, map fully colored |
| 2 | Year dropdown shows all available years | **PASS** | 2002–2024 (12 years) |
| 3 | Race dropdown shows correct races per year | **PASS** | 2024: President, State Assembly, State Senate, US House, US Senate. 2020: President, State Assembly, State Senate, US House |
| 4 | Switching year recolors map with correct ward count | **PASS** | 2020→6,656 wards, 2024→6,819 wards (vintage difference) |
| 5 | Switching race recolors map | **PASS** | Verified via `setFeatureState` — sub-100ms switching |
| 6 | Ward click opens detail panel | **PASS** | Panel slides in from right with ward name, municipality, county, districts, election history |
| 7 | Ward hover shows tooltip | **PASS** | Tooltip follows cursor with ward name, DEM/REP %, margin, total votes |
| 8 | URL updates on election/ward change | **PASS** | `?year=2024&race=president&ward=55089511500012` |
| 9 | Detail panel shows "Report Card" button | **PASS** | Navigates to `/wards/{id}/report` |
| 10 | Detail panel shows district badges (CD, SD, AD) | **PASS** | Correctly shows CD-6, SD-8, AD-24 for Mequon ward |
| 11 | Legend renders correctly | **PASS** | R+30 to D+30 diverging scale with "No data" swatch |
| 12 | Estimated data disclosure | **PASS** | Amber badge on estimated wards + footnote in detail panel |
| 13 | Map zoom/pan controls work | **PASS** | +/- buttons and compass rose functional |
| 14 | Map loading state | **PASS** | Amber pulsing dot with "Loading data" text while fetching |

---

## Feature: Ward Explorer (`/wards`)

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 15 | Page loads with empty state | **PASS** | "Select a ward to view details" prompt |
| 16 | Ward name search returns results | **PASS** | "Milwaukee" → 50 results |
| 17 | Search results show ward name + municipality + county | **PASS** | e.g., "Bayside - V 0001, Bayside, Milwaukee County" |
| 18 | Clicking search result loads detail panel | **PASS** | Shows election history cards with bar charts |
| 19 | Address geocoding | **WARN** | "Find" button disabled until text is entered; placeholder text "123 Main St, Madison, WI" is not actual input |
| 20 | "Report Card" button in detail | **PASS** | Navigates to ward report route |
| 21 | "View on Map" button in detail | **PASS** | Navigates to `/map` with ward pre-selected |
| 22 | **Duplicate search results across vintages** | **WARN** | Each ward appears 3x (once per vintage: 2020, 2022, 2025). Search does not filter by vintage or deduplicate. Users see "Bayside - V 0001" three times with no way to distinguish them |
| 23 | Search minimum length enforcement | **PASS** | API rejects queries < 2 chars with 422 |

---

## Feature: My Ward Report Card (`/wards/report`)

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 24 | Landing page (no ward ID) | **PASS** | Shows "Find by Address" and "Search by Ward Name" cards |
| 25 | Direct URL with valid ward ID | **PASS** | `/wards/55089511500012/report` loads full report for Mequon C 0012 |
| 26 | Direct URL with invalid ward ID | **PASS** | `/wards/55079002500001/report` shows "Failed to load report card" error with ward ID displayed |
| 27 | Partisan Lean card | **PASS** | Shows R+8.2 with percentile ("More Dem. than 59% of wards") |
| 28 | Trend card | **PASS** | Shows "Trending Democratic" with slope +1.18 margin pts/cycle, p<0.05 |
| 29 | Avg. Turnout card | **PASS** | Shows 1,037 votes per presidential election |
| 30 | Comparison chart (Ward vs County vs State) | **PASS** | Recharts line chart with 3 series |
| 31 | "Share" button | **PASS** | Copies URL to clipboard |
| 32 | "View on Map" button | **PASS** | Navigates to `/map` with ward pre-selected |
| 33 | **Turnout card subtitle inaccuracy** | **WARN** | Card says "votes per presidential election" but the underlying data averages ALL race types in the turnout array, not just presidential. The label should match the computation or filter to presidential only |
| 34 | Estimate disclosure at bottom | **PASS** | Conditionally shown when `has_estimates` is true |

---

## Feature: Supreme Court (`/supreme-court`)

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 35 | Page loads with 2025 data | **PASS** | Schimel vs Crawford, 2,364,887 total votes |
| 36 | Statewide summary bar | **PASS** | Crawford +10.1 with percentage bar |
| 37 | "Why no map?" explainer | **PASS** | Clear explanation of reporting unit vs ward distinction |
| 38 | Year selector | **PASS** | Shows available spring election years |
| 39 | "By County" view | **PASS** | All 72 counties displayed with votes, %, total, units, result |
| 40 | "By Reporting Unit" view | **PASS** | Paginated table with county + RU name + candidate votes |
| 41 | County search filter | **PASS** | Client-side filtering works correctly |
| 42 | Pagination | **PASS** | Next/Prev buttons with page count display |
| 43 | **Candidate color convention** | **WARN** | Candidate 1 (conservative) shown in red, Candidate 2 (liberal) in blue. This is hardcoded positional, not party-based. If a future spring election reverses the candidate order in the data, colors would be wrong |

---

## Feature: Trends (`/trends`)

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 44 | Ward Trends tab loads | **PASS** | Search box + race type selector |
| 45 | Area Trends tab loads | **PASS** | County/district filter with search |
| 46 | Trend Map tab loads | **PASS** | 6,670 wards classified, trend summary shows D/R/Inconclusive counts |
| 47 | Trend Map shows viewport-aware summary | **PASS** | Counts update as map is panned/zoomed. Shows 1,154 wards in current view |
| 48 | Trend methodology banner | **PASS** | Explains linear regression approach, color meaning, significance |
| 49 | Race type options in Ward Trends | **PASS** | president, governor, us_senate, state_senate, state_assembly |
| 50 | **Trend Map hardcoded to presidential** | **WARN** | TrendMapOverlay calls `useTrendClassifications('president')` — no UI to change race type on Trend Map tab |

---

## Feature: Swing Modeler (`/modeler`)

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 51 | Page loads with defaults | **PASS** | Uniform Swing, 2024 President, 6,819 wards |
| 52 | Projected Results panel | **PASS** | R+0.9, REP Win, exact vote totals, ward counts |
| 53 | Statewide Swing slider | **PASS** | Range R+15 to D+15, step 0.1 |
| 54 | Turnout Change slider | **PASS** | Range -30% to +30%, step 1 |
| 55 | Regional Swing (collapsed section) | **PASS** | Milwaukee Metro, Madison Metro, Fox Valley, Rural sliders |
| 56 | Scenario presets (6 buttons) | **PASS** | 2020 Electorate, 2016 Electorate, High Turnout, Low Turnout, D Wave +5, R Wave +5 |
| 57 | Model selector dropdown | **PASS** | Uniform Swing, Proportional Swing, Demographic Swing, MRP |
| 58 | Uncertainty checkbox | **PASS** | Toggles uncertainty overlay panel |
| 59 | URL state sync | **PASS** | All parameters encoded in URL for sharing |
| 60 | Web Worker computation | **PASS** | Debounced 50ms, predictions update map in real-time |
| 61 | Reset to Baseline button | **PASS** | Disabled when all params are at zero; resets all sliders |
| 62 | **MRP model requires fitted traces** | **TODO** | MRP selection works but requires server-side fitted model files that don't exist yet. Will show error or empty results |

---

## Feature: Election Comparison (`/compare`)

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 63 | Page loads with defaults | **PASS** | 2024 President vs 2020 President side-by-side |
| 64 | Side by Side mode | **PASS** | Two synchronized maps with labels |
| 65 | Difference mode | **PASS** | Single map with diff choropleth (red/blue shift scale) |
| 66 | Election A selector | **PASS** | Year + race dropdowns |
| 67 | Election B selector | **PASS** | Year + race dropdowns |
| 68 | Map viewport sync | **PASS** | Panning either map syncs both |
| 69 | View mode toggle | **PASS** | Segmented button control |

---

## Cross-Cutting: Navigation & Layout

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 70 | Header nav with all 7 links | **PASS** | Election Map, Supreme Court, Ward Explorer, My Ward, Trends, Swing Modeler, (Compare is via gear icon) |
| 71 | Skip to content link | **PASS** | `#main-content` anchor for screen readers |
| 72 | Lazy-loaded routes | **PASS** | Each page loads independently via `React.lazy` |
| 73 | **Compare link hidden in gear icon** | **WARN** | The `/compare` route is not visible in the main nav — appears to be accessed via a settings/gear icon at the far right. Not immediately discoverable |
| 74 | PWA service worker | **PASS** | Workbox with `skipWaiting` and `cacheableResponse: [0, 200]` |
| 75 | Responsive nav | **PASS** | Horizontal scrollable nav on mobile |

---

## Cross-Cutting: API

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 76 | Health endpoint | **PASS** | `GET /health` returns `{ status: "healthy" }` |
| 77 | CORS configuration | **PASS** | Configured via `API_CORS_ORIGINS` env var |
| 78 | GZip middleware | **PASS** | Enabled in FastAPI app |
| 79 | Cache headers on map data | **PASS** | 24-hour cache on `/elections/map-data/` |
| 80 | Cache headers on boundaries | **PASS** | 7-day cache on `/wards/boundaries` |
| 81 | **No authentication on any endpoint** | **NEEDS GATING** | All API endpoints are public with no auth. Fine for read-only public data, but MRP fit endpoint (`POST /models/mrp/fit`) can trigger expensive server-side computation and should be gated |
| 82 | **No rate limiting** | **NEEDS GATING** | No rate limiting on any endpoint. Geocoding endpoint proxies to Census API which has its own limits, but our endpoints themselves are unprotected |

---

## Data Integrity

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 83 | Ward count consistency (2024 President) | **PASS** | Map shows 6,819 wards, API returns `wardCount: 6819` |
| 84 | Estimated data flagging | **PASS** | `is_estimate` field present on ward and election records |
| 85 | Multi-vintage data loaded | **PASS** | 3 vintages: 2020, 2022, 2025 |
| 86 | **No vintage filtering in search** | **FAIL** | Ward search returns all vintages without deduplication. The same physical ward appears 3x in search results. Should default to latest vintage or allow vintage selection |
| 87 | **Report card fails for some ward IDs** | **FAIL** | Ward ID `55079002500001` returns "Failed to load report card". Likely a ward that only exists in one vintage but the report card endpoint expects the ID to be in the current vintage. Needs better error handling or cross-vintage ID resolution |

---

## Infrastructure & Deployment

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 88 | Nginx DNS re-resolution | **PASS** | `resolver [fd12::10] ipv6=on valid=5s` implemented |
| 89 | PMTiles served with cache headers | **PASS** | 30-day immutable cache |
| 90 | Docker Compose with 6 services | **PASS** | db, redis, api, celery-worker, seed, tiles profiles |
| 91 | Alembic migrations | **PASS** | Initial schema migration exists |

---

## Prioritized Fix Plan

### Priority 1 — FAIL (Fix Immediately)

1. **Ward search vintage deduplication** — Search API returns all 3 vintages per ward. Either:
   - Add a `ward_vintage` filter parameter defaulting to the latest vintage
   - Deduplicate results on the server by grouping on canonical ward attributes (name + municipality)
   - Display vintage badge on search results so users can distinguish

2. **Report card cross-vintage ward ID resolution** — When a ward ID from one vintage is used with the report card endpoint, it may 404. Either:
   - Try all vintages when the primary lookup fails
   - Map ward IDs across vintages using geographic overlap
   - Show a helpful message directing users to search by name instead

### Priority 2 — NEEDS GATING (Security)

3. **Rate limit the MRP fit endpoint** — `POST /models/mrp/fit` triggers expensive PyMC computation. Add authentication or at minimum rate limiting.

4. **Add basic rate limiting to all endpoints** — Protect against abuse, especially geocoding (which proxies to Census API).

### Priority 3 — WARN (Quality Improvements)

5. **Fix turnout card subtitle** — Report card Avg. Turnout card says "votes per presidential election" but averages all race types. Either filter to presidential or change the label.

6. **Add vintage badge to search results** — Even after deduplication, users should see which ward boundary era their result belongs to.

7. **Make Compare page discoverable** — Add `/compare` to the main nav bar instead of hiding it behind the gear icon.

8. **Add race type selector to Trend Map** — Currently hardcoded to presidential. Allow switching to governor, US Senate, etc.

9. **Supreme Court candidate color logic** — Colors are based on position (candidate_1 = red, candidate_2 = blue). Add a party/ideology field to the data model to make this explicit rather than positional.

### Priority 4 — TODO (Future Work)

10. **MRP model training** — Run `fit_mrp_models.py` to generate fitted trace files.
11. **Frontend test suite** — Zero test files exist for the client. Add Vitest + Testing Library.
12. **Accessibility audit** — Screen reader testing, keyboard navigation verification, ARIA improvements.
13. **Bundle optimization pass** — Code splitting exists but no formal analysis.
14. **Data manager page** — `/data` route exists but is a placeholder.
15. **Scenario save/load** — Model endpoint stubs exist but are not implemented.
16. **Small multiples standalone view** — Sparkline grid exists within Area Trends but not as a dedicated feature.
