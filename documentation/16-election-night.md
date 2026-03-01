# 16 — Election Night Live Results

**Tagline:** Real-time election night results with live polling, race summaries, and ward-level reporting.

**Route:** `/live`

---

## Overview

The Election Night feature provides a live results dashboard for active election nights. It polls the API at configurable intervals, displays race-by-race summaries with two-party vote bars, and shows reporting progress. When no election is active, it displays an informative empty state explaining the feature.

---

## Data Model

### Backend Models

#### `LiveElection` (SQLAlchemy)

| Column | Type | Description |
|--------|------|-------------|
| id | Integer (PK) | Auto-increment |
| election_date | String(20) | Date string (YYYY-MM-DD) |
| election_name | String(255) | Display name |
| is_active | Boolean | Whether currently streaming results |
| total_wards | Integer | Total wards expected to report |
| wards_reporting | Integer | Wards that have reported so far |
| last_updated | DateTime | Timestamp of last data update |

#### `LiveResult` (SQLAlchemy)

| Column | Type | Description |
|--------|------|-------------|
| id | Integer (PK) | Auto-increment |
| election_date | String(20) | FK to LiveElection |
| ward_id | String(50) | Ward identifier |
| race_type | String(50) | Race type (president, governor, etc.) |
| dem_votes | Integer | Democratic votes |
| rep_votes | Integer | Republican votes |
| other_votes | Integer | Other party votes |
| total_votes | Integer | Total votes |
| precincts_reporting | Integer | Precincts reported in this ward |
| pct_reporting | Float | Percentage of ward reported (0-100) |
| is_final | Boolean | Whether this ward's results are final |
| last_updated | DateTime | Last update timestamp |

### API Endpoints

| Method | Endpoint | Response | Description |
|--------|----------|----------|-------------|
| GET | `/api/v1/live/elections` | `LiveElectionResponse[]` | List all election sessions |
| GET | `/api/v1/live/results/{election_date}` | `LiveResultsResponse` | Full results with race summaries and ward data |

### Response Schema — `LiveResultsResponse`

```typescript
{
  election: LiveElectionResponse;
  races: LiveRaceSummary[];        // Aggregated by race_type
  ward_results: Record<string, LiveWardResult>;
  last_poll: string;               // ISO timestamp
}
```

---

## Dashboard Elements

### Sidebar

1. **Election Selector** — Dropdown listing available elections. Auto-selects active election.
2. **ReportingProgress** — Card showing overall reporting percentage with:
   - Circular-style progress indicator (green background bar)
   - Live indicator (green pulsing dot) when election is active
   - "Last updated X ago" time display
3. **LiveResultsTicker** — List of race summary cards, each showing:
   - Race type label
   - Two-party vote bar (blue/red proportional)
   - Candidate vote totals and percentages
   - Margin display
   - Wards reporting count

### Map Area

- **WisconsinMap** — Renders ward-level results as choropleth (dem% color scale)
- Ward results from `LiveWardResult` are converted to `MapDataResponse` format for the shared map

### Empty State

When no election is active or no data is available:
- Large informational card explaining the feature
- Lists what will be available during election nights
- Encourages users to check back on election day

---

## Polling Behavior

| Condition | Refetch Interval |
|-----------|-----------------|
| Active election | 10 seconds |
| Inactive election | Polling disabled |
| Election list | 30 seconds |

Polling uses TanStack Query's `refetchInterval` with conditional logic based on `is_active` status.

---

## Business Rules

1. Only one election should be active at a time (enforced by backend)
2. Ward results are keyed by `ward_id` — duplicate wards for same election overwrite
3. Race summaries are aggregated from ward-level results on the server
4. `pct_reporting` is calculated as `wards_reporting / total_wards * 100`
5. `margin` is calculated as `(dem - rep) / total * 100` (positive = D lead)

---

## Edge Cases

- **No active election**: Shows empty state UI, no polling
- **Backend unavailable**: TanStack Query handles errors; stale data shown if cached
- **Multiple race types**: Grouped and displayed as separate ticker cards
- **Ward with 0 votes**: Shows 0% for both parties, no color on map

---

## Files

| File | Purpose |
|------|---------|
| `features/election-night/index.tsx` | Main page component |
| `features/election-night/components/LiveResultsTicker.tsx` | Race summary cards |
| `features/election-night/components/ReportingProgress.tsx` | Reporting progress card |
| `features/election-night/hooks/useLiveResults.ts` | TanStack Query hooks with polling |
| `server/app/models/live_result.py` | SQLAlchemy models (LiveResult, LiveElection) |
| `server/app/api/v1/endpoints/live_results.py` | FastAPI endpoints |
| `routes/index.tsx` | Route entry at `/live` |
| `App.tsx` | Nav item with Radio icon |
