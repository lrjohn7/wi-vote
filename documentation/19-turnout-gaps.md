# 19. Turnout Gaps — Votes Left on the Table

> Identifies wards with below-average turnout relative to their county, showing untapped vote potential by party.

## Route

`/turnout-gaps`

## Data Model

### TurnoutGapWard
| Field | Type | Description |
|-------|------|-------------|
| ward_id | string | Ward identifier |
| ward_name | string | Human-readable ward name |
| municipality | string | Municipality name |
| county | string | County name |
| total_votes | number | Actual total votes cast |
| county_avg_turnout | number | Average total votes per ward in same county |
| turnout_gap | number | Difference from county average (negative = below avg) |
| party_pct | number | Selected party's vote percentage |
| potential_votes | number | Gap * party_pct / 100 — theoretical additional votes |

### TurnoutGapsResponse
| Field | Type | Description |
|-------|------|-------------|
| year | number | Election year |
| race_type | string | Race type (president, governor, etc.) |
| party | string | "dem" or "rep" |
| total_potential | number | Sum of all potential_votes |
| wards_below_avg | number | Count of wards below county average |
| avg_gap | number | Mean turnout gap across below-average wards |
| wards | TurnoutGapWard[] | Sorted by potential_votes descending |

## API Endpoint

```
GET /api/v1/elections/turnout-gaps/{year}/{race_type}?party=dem&limit=200
```

**Parameters:**
- `year` (path): Election year (e.g., 2024)
- `race_type` (path): Race type (e.g., president)
- `party` (query): "dem" or "rep" (default: "dem")
- `limit` (query): Max wards to return (default: 200, max: 1000)

**Logic:**
1. Compute county-level average total votes per ward via subquery
2. Find all wards below their county average
3. For each ward, compute `potential_votes = |gap| * (party_pct / 100)`
4. Sort by potential_votes descending

## UI Components

### Top Bar
- Year selector (auto-selects most recent available)
- Race type selector (prefers president)
- Party toggle (Democrat / Republican) with blue/red styling

### Summary Cards (3)
- **Total Potential Votes** — sum of all potential_votes
- **Wards Below Average** — count of below-average wards
- **Avg Turnout Gap** — mean gap value

### Ward Table
- Scrollable table showing: ward name, county, votes, county avg, gap, party %, potential votes
- Sorted by highest potential votes first
- Tabular-nums formatting for all numeric columns

## Files

| File | Description |
|------|-------------|
| `client/src/features/turnout-gaps/index.tsx` | Main page component |
| `client/src/features/turnout-gaps/hooks/useTurnoutGaps.ts` | TanStack Query hook |
| `server/app/api/v1/endpoints/elections.py` | API endpoint (GET /turnout-gaps) |
| `server/app/services/election_service.py` | `get_turnout_gaps()` method |
| `client/src/App.tsx` | Nav item entry |
| `client/src/routes/index.tsx` | Lazy route definition |

## Business Rules

- Only wards with below-county-average turnout are included
- County average is computed per-county from all wards in that county for the given election
- Potential votes = absolute gap * party percentage / 100
- Minimum of 1 ward per county required (counties with 0 wards in the election are excluded)
- 5-minute staleTime on the frontend query

## Edge Cases

- Ward with 0 votes: included if county avg > 0 (gap = -countyAvg)
- County with only 1 ward: that ward is always exactly at the average (gap = 0), excluded
- Missing party data: ward excluded from potential calculation
