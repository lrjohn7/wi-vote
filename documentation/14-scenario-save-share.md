# 14 — Scenario Save & Share

> Persistent, named, shareable swing modeler scenarios with short URL IDs.

**Route:** `/modeler?scenario={shortId}`
**Feature:** Extends the Swing Modeler (see `05-swing-modeler.md`)

---

## Data Model

### Scenario (database table)

| Column | Type | Description |
|--------|------|-------------|
| `id` | `serial` | Auto-increment primary key |
| `short_id` | `varchar(16)` | URL-safe unique ID (12 chars, `secrets.token_urlsafe(9)`) |
| `name` | `varchar(255)` | User-provided scenario name |
| `description` | `text` | Optional description |
| `model_id` | `varchar(50)` | Model type: `uniform-swing`, `proportional-swing`, `demographic-swing`, `mrp` |
| `parameters` | `JSONB` | Full parameter dict (flexible across model types) |
| `created_at` | `datetime` | Creation timestamp |

**Indexes:** `short_id` (unique), `created_at` (for recent listing)

### ScenarioSummary (frontend type)

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Short ID for URLs |
| `name` | `string` | Display name |
| `description` | `string \| null` | Optional description |
| `model_id` | `string` | Model type |
| `parameters` | `Record<string, unknown>` | Full parameter dict |
| `created_at` | `string` | ISO timestamp |

---

## API Endpoints

### `GET /api/v1/models/scenarios`

List recent community-saved scenarios. Ordered by `created_at DESC`.

**Query params:** `limit` (1-100, default 20), `offset` (default 0)

**Response:** `{ scenarios: ScenarioSummary[], total: number }`

### `POST /api/v1/models/scenarios`

Save a new scenario. Returns 201 with the generated short ID.

**Body:** `{ name: string, description?: string, model_id: string, parameters: dict }`

**Response:** `ScenarioSummary` with generated `id` (short_id)

### `GET /api/v1/models/scenarios/{scenario_id}`

Load a saved scenario by short ID. Returns 404 if not found.

**Response:** `ScenarioSummary`

---

## Dashboard Elements

| Element | Component | Behavior |
|---------|-----------|----------|
| Save button | `SaveScenarioDialog` | Opens dialog to name and save current parameters |
| Save dialog | Radix Dialog | Name input (required), description (optional), copy-link after save |
| Community list | `CommunityScenarios` | Shows 5 most recent saved scenarios as ghost buttons |
| URL loading | `useModelerUrlState` | `?scenario=abc123` fetches and applies scenario on mount |

---

## User Flow

1. User adjusts model sliders to desired parameters
2. Clicks "Save Current Scenario" button in the Scenarios section
3. Dialog opens — user enters a name and optional description
4. Clicks "Save Scenario" — API creates scenario, returns short ID
5. Dialog shows the share URL with a copy-to-clipboard button
6. Anyone visiting the URL has the scenario parameters loaded automatically
7. Community scenarios appear below the preset buttons for discovery

---

## Business Rules

1. **Anonymous:** No authentication required. Scenarios are public.
2. **No delete:** Scenarios persist indefinitely. No user-facing delete (cleanup via future backend job if needed).
3. **Short ID generation:** `secrets.token_urlsafe(9)` → 12-char URL-safe string. Unique constraint with retry on collision.
4. **JSONB parameters:** Stores full parameter dict as-is. Works across all 4 model types without schema changes.
5. **URL priority:** When `?scenario=` is present, individual URL params (e.g. `?swing=5`) are skipped. Scenario takes full priority.
6. **Model activation:** Loading a scenario sets both the active model ID and all parameters.
7. **Community list:** Shows 5 most recent scenarios. Hidden when no saved scenarios exist.
8. **Validation:** Name is required (max 255 chars). Empty name disables the save button.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Nonexistent scenario ID in URL | Fetch fails silently, modeler loads with default state |
| Empty name submitted | Save button disabled, cannot submit |
| Duplicate short ID (collision) | Backend retries with a new short ID |
| No saved scenarios | Community section hidden |
| Very long parameter dict | JSONB handles arbitrary size |

---

## Files

| File | Purpose |
|------|---------|
| `packages/server/alembic/versions/0002_scenarios_table.py` | Migration: creates `scenarios` table |
| `packages/server/app/models/scenario.py` | SQLAlchemy `Scenario` model |
| `packages/server/app/services/scenario_service.py` | CRUD operations: create, get, list |
| `packages/server/app/api/v1/endpoints/models.py` | 3 API endpoints (list, create, get) |
| `packages/client/src/components/ui/dialog.tsx` | shadcn Dialog component (Radix) |
| `packages/client/src/services/api.ts` | `saveScenario()`, `loadScenario()`, `listScenarios()` |
| `packages/client/src/services/queryKeys.ts` | `scenarios` query key factory |
| `packages/client/src/features/swing-modeler/hooks/useScenarios.ts` | TanStack Query hooks |
| `packages/client/src/features/swing-modeler/components/SaveScenarioDialog.tsx` | Save dialog with share URL |
| `packages/client/src/features/swing-modeler/components/ControlsPanel.tsx` | Save button + community list integration |
| `packages/client/src/features/swing-modeler/hooks/useModelerUrlState.ts` | `?scenario=` URL param loading |
