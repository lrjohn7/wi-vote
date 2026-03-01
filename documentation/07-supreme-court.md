# 07 — Supreme Court

> Spring election results for Wisconsin Supreme Court races at reporting-unit level.

**Route:** `/supreme-court`

---

## Data Model

### Spring Contest

| Field | Type | Description |
|-------|------|-------------|
| `year` | `number` | Election year |
| `contest_name` | `string` | e.g., "Justice of the Supreme Court" |
| `candidate_1_name` | `string` | First candidate (typically conservative) |
| `candidate_2_name` | `string` | Second candidate (typically liberal) |

### Spring Result (per reporting unit)

| Field | Type | Description |
|-------|------|-------------|
| `county` | `string` | County name |
| `reporting_unit` | `string` | Reporting unit name |
| `candidate_1_votes` | `number` | Votes for candidate 1 |
| `candidate_2_votes` | `number` | Votes for candidate 2 |
| `total_votes` | `number` | Total votes cast |

### County Summary

| Field | Type | Description |
|-------|------|-------------|
| `county` | `string` | County name |
| `candidate_1_votes` | `number` | Total candidate 1 votes in county |
| `candidate_2_votes` | `number` | Total candidate 2 votes in county |
| `total_votes` | `number` | Total votes in county |
| `reporting_units` | `number` | Number of reporting units |
| `winner` | `string` | Candidate with more votes |

---

## API Endpoints

### `GET /api/v1/spring-elections`

Lists all available spring election contests (years + candidate names).

### `GET /api/v1/spring-elections/{year}?county=X&search=X&page=1&page_size=100`

Paginated reporting-unit-level results. Filterable by county and reporting unit search.

### `GET /api/v1/spring-elections/{year}/counties`

County-level aggregation of spring election results.

---

## Dashboard Elements

### Top Bar

| Element | Type | Behavior |
|---------|------|----------|
| Page title | `<h1>` | "Supreme Court Elections" |
| Year selector | Dropdown | Available spring election years |
| "Why no map?" button | Expandable explainer | Explains reporting units vs wards distinction |

### Statewide Summary

| Element | Type | Behavior |
|---------|------|----------|
| Winner banner | Colored bar | Shows winner name + margin (e.g., "Crawford +10.1") |
| Two-party bar | Horizontal bar | Candidate 1 (red) vs Candidate 2 (blue) with percentages |
| Total votes | Text | e.g., "2,364,887 total votes" |

### View Toggle

| Tab | Content |
|-----|---------|
| By County | All 72 counties with votes, percentages, total, units, result |
| By Reporting Unit | Paginated table with county + RU name + candidate votes |

### County View

| Element | Type | Behavior |
|---------|------|----------|
| County search | Text input | Client-side filtering |
| County table | Table | Columns: County, Cand 1 Votes, Cand 2 Votes, Total, Units, Result |
| Result badge | Colored text | Red for cand 1 win, blue for cand 2 win |

### Reporting Unit View

| Element | Type | Behavior |
|---------|------|----------|
| County filter dropdown | Select | Filter by county |
| Search input | Text | Filter reporting units by name |
| Paginated table | Table | County, RU Name, Cand 1 Votes, Cand 2 Votes, Total |
| Pagination | Prev/Next buttons | With page count display |

---

## Business Rules

1. **No map view:** Spring elections use reporting units, not wards. The "Why no map?" explainer clarifies this to users.
2. **Candidate colors:** Candidate 1 → red, Candidate 2 → blue. **This is positional, not party-based.** See audit item #43.
3. **Margin formatting:** Winner's name + margin points (e.g., "Crawford +10.1").
4. **Client-side county filtering:** The county search filters the already-loaded county summary data.
5. **Reporting unit pagination:** Server-side pagination (page + page_size parameters).
6. **Default year:** Shows most recent spring election year.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No spring elections available | Empty state message |
| County with 0 votes | Row still shown with zero values |
| Search returns no results | "No results" message |
| Future election with reversed candidate order | Colors would be wrong (see audit WARN #43) |

---

## Files

| File | Purpose |
|------|---------|
| `features/supreme-court/index.tsx` | Page component — summary, county view, RU view |
| `features/supreme-court/hooks/useSpringElections.ts` | TanStack Query: contests, results, county summary |
| `server/api/v1/endpoints/spring_elections.py` | API: list contests, get results, county summary |
| `server/services/spring_election_service.py` | Backend logic for spring election queries |
