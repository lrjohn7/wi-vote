# 17 — Voter Registration Data

**Tagline:** Voter registration statistics overlay for Wisconsin wards.

**Route:** N/A (overlay on Election Map and Ward Explorer)

---

## Overview

The Voter Registration feature provides an API and client hooks for displaying voter registration data as a map overlay or in ward detail views. Wisconsin does not have party registration, so the data focuses on total/active/inactive registered voters and registration rates.

---

## Data Model

### Backend Model — `VoterRegistration` (SQLAlchemy)

| Column | Type | Description |
|--------|------|-------------|
| id | Integer (PK) | Auto-increment |
| ward_id | String(50) | Ward identifier |
| snapshot_date | String(20) | Date of the registration snapshot |
| total_registered | Integer | Total registered voters |
| active_registered | Integer | Active registered voters |
| inactive_registered | Integer | Inactive registered voters |
| dem_registered | Integer (nullable) | Democratic registrants (N/A in WI) |
| rep_registered | Integer (nullable) | Republican registrants (N/A in WI) |
| registration_rate | Float (nullable) | Registration rate as percentage of VAP |
| ward_vintage | Integer | Ward boundary vintage |
| data_source | String(100) | Data source identifier |

### API Endpoints

| Method | Endpoint | Response | Description |
|--------|----------|----------|-------------|
| GET | `/api/v1/voter-registration/ward/{ward_id}` | `WardRegistrationResponse[]` | Registration history for a single ward |
| GET | `/api/v1/voter-registration/map-data` | `RegistrationMapResponse` | All ward registration data for map overlay |
| GET | `/api/v1/voter-registration/summary` | `RegistrationSummaryResponse` | Aggregate statistics |

### Query Parameters

- `snapshot_date` (optional) — Filter to a specific snapshot date. Defaults to most recent.

---

## Client Hooks

### `useVoterRegistrationMap(snapshotDate?)`
- Fetches all ward registration data for map overlay
- Returns `RegistrationMapResponse` with ward-keyed data
- 10-minute stale time (registration data doesn't change frequently)

### `useWardRegistration(wardId)`
- Fetches registration history for a single ward
- Returns `WardRegistrationResponse[]` sorted by date descending
- Used in ward detail panels

---

## Business Rules

1. **Wisconsin has no party registration** — `dem_registered` and `rep_registered` are always null. The model includes them for potential future use or cross-state comparisons.
2. **Registration rate** is total_registered / voting_age_population (from Census data). May be null if VAP data is unavailable.
3. **Snapshot dates** represent point-in-time registration snapshots. Multiple snapshots may exist per ward.
4. **Default behavior**: When no snapshot_date is specified, the API returns the most recent snapshot.

---

## Edge Cases

- **No registration data**: API returns empty data object; map overlay shows no changes
- **Missing VAP data**: `registration_rate` will be null for wards without Census demographics
- **Multiple snapshots**: Ward detail can show registration trend over time

---

## Files

| File | Purpose |
|------|---------|
| `features/election-map/hooks/useVoterRegistration.ts` | TanStack Query hooks |
| `server/app/models/voter_registration.py` | SQLAlchemy model |
| `server/app/api/v1/endpoints/voter_registration.py` | FastAPI endpoints |
