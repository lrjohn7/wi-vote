# 05 — Swing Modeler

> What-if election modeling with real-time map updates. Uniform, proportional, demographic, and MRP models.

**Route:** `/modeler`
**URL params:** All model parameters encoded for sharing (via `useModelerUrlState`)

---

## Data Model

### Prediction (per ward)

| Field | Type | Description |
|-------|------|-------------|
| `wardId` | `string` | LTSB identifier |
| `predictedDemPct` | `number` | Projected Democratic percentage |
| `predictedRepPct` | `number` | Projected Republican percentage |
| `predictedMargin` | `number` | Projected margin (positive = D) |
| `predictedDemVotes` | `number` | Projected Democratic votes |
| `predictedRepVotes` | `number` | Projected Republican votes |
| `predictedTotalVotes` | `number` | Projected total votes |
| `confidence` | `number` | 0-1 confidence score |

### Uncertainty Band

| Field | Type | Description |
|-------|------|-------------|
| `wardId` | `string` | |
| `lowerDemPct` / `upperDemPct` | `number` | Confidence interval for D% |
| `lowerMargin` / `upperMargin` | `number` | Confidence interval for margin |

### Aggregated Result

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | County, district, or state name |
| `demVotes` / `repVotes` | `number` | Summed projected votes |
| `margin` | `number` | Aggregated margin |
| `wardCount` | `number` | Number of wards in group |

---

## API Endpoints

### `GET /api/v1/models/available`

Lists all models with metadata. Includes `serverSide: boolean` flag and `fittedElections` for MRP.

### `POST /api/v1/models/predict` (MRP only)

Body: `{ model_id: "mrp", parameters: { baseElectionYear, baseRaceType, ... } }`

Client-side models (uniform, proportional, demographic) compute in the Web Worker — this endpoint returns a message directing to the worker.

### `POST /api/v1/models/mrp/fit`

Triggers async Celery task for MRP model fitting. Returns `{ task_id, status: "PENDING" }`.

### `GET /api/v1/models/mrp/fit/{task_id}`

Polls fitting task status. Returns progress, diagnostics (R-hat, ESS) on completion.

### `GET /api/v1/models/mrp/fitted`

Lists pre-fitted MRP models available for prediction.

### `GET /api/v1/models/scenarios`

List recent community-saved scenarios. Query params: `limit` (default 20), `offset`. See `14-scenario-save-share.md`.

### `POST /api/v1/models/scenarios`

Save current model parameters with a name. Returns `{ id, name, description, model_id, parameters, created_at }`.

### `GET /api/v1/models/scenarios/{scenario_id}`

Load a saved scenario by short ID. Returns full parameter set for restoring model state.

---

## Dashboard Elements

### Left Panel — Controls

| Element | Type | Behavior |
|---------|------|----------|
| Model selector | Dropdown | Uniform Swing, Proportional Swing, Demographic Swing, MRP |
| Base election year | Dropdown | Available years from elections API |
| Base race type | Dropdown | president, governor, us_senate, etc. |
| Statewide Swing slider | Range slider | R+15 to D+15, step 0.1 |
| Statewide Turnout slider | Range slider | -30% to +30%, step 1 (baseline for all wards) |
| Regional Swing section | Collapsible | Milwaukee Metro, Madison Metro, Fox Valley, Rural sliders (uniform/proportional only) |
| Regional Turnout section | Collapsible | Per-region turnout offset -20% to +20%, stacked on statewide (uniform/proportional only) |
| Demographic sliders | Visible for demographic model | Urban, Suburban, Rural swing adjustment |
| Demographic Turnout section | Collapsible | Per-classification turnout offset -20% to +20% (demographic model only) |
| MRP sliders | Visible for MRP model | College shift, Income shift, Urban shift, Rural shift |
| Scenario presets | 8 buttons | 2020/2016 Electorate, High/Low Turnout, D/R Wave +5, MKE Surge, Rural Mobilize |
| MRP Status | Section | Shows fitted models, fitting progress, trigger button |
| Uncertainty toggle | Checkbox | Shows/hides uncertainty overlay |
| Reset to Baseline | Button | Disabled when all params are zero. Resets all sliders |

### Right Panel — Map + Results

| Element | Type | Behavior |
|---------|------|----------|
| Wisconsin map | `WisconsinMap` with predictions | Wards colored by predicted margin |
| Map legend | `MapLegend` | Same RdBu scale as Election Map |
| Ward tooltip | Floating | Shows predicted margin, vote shift from baseline |
| Ward detail panel | Slide-in | Predicted vs baseline comparison for clicked ward |
| Results summary | `ResultsSummary` | Projected winner, margin, vote totals, shift from baseline |
| Aggregation tabs | Counties, CD, SD, AD | Sorted tables with aggregated predictions |
| Uncertainty overlay | `UncertaintyOverlay` | Average band width, high/low confidence ward counts |

---

## Model Implementations

### Client-Side (Web Worker: `model.worker.ts`)

| Model | Algorithm |
|-------|-----------|
| **Uniform Swing** | Adds constant points to two-party vote share across all wards |
| **Proportional Swing** | Multiplicative adjustment: `basePct * (1 + swing)`. Preserves relative differences |
| **Demographic Swing** | Different swing values for urban/suburban/rural classifications |

All three compute in `model.worker.ts` via `postMessage`. Worker debounces at 50ms.

### Differential Turnout (`getEffectiveTurnout`)

Turnout changes are computed per-ward by stacking offsets additively:

```
effectiveTurnout = statewideTurnout + regionOffset + classificationOffset
```

- **Statewide Turnout:** Baseline change applied to all wards (-30% to +30%).
- **Regional Turnout:** Per-region offset stacked on statewide. Available for uniform/proportional models. Regions: Milwaukee Metro, Madison Metro, Fox Valley, Rural (-20% to +20%).
- **Demographic Turnout:** Per-classification offset stacked on statewide. Available for demographic model. Classifications: Urban, Suburban, Rural (-20% to +20%).

Ward classifications (urban/suburban/rural) are always passed to the worker for demographic turnout lookup, regardless of active model type.

### Server-Side (MRP)

MRP predictions come from `POST /api/v1/models/predict` with `model_id: "mrp"`. Requires pre-fitted trace files (via Celery + PyMC). See audit item #62.

### Uncertainty Computation (`computeUncertainty.ts`)

Confidence bands based on:
- Number of historical elections (more elections → narrower bands)
- Historical volatility (standard deviation of margins)
- Estimate status (estimated wards get wider bands)

Bands converted to opacity values for map visualization: high confidence → full opacity, low confidence → semi-transparent.

---

## Business Rules

1. **Web Worker computation:** All client-side models run off-main-thread via `model.worker.ts`. Debounced at 50ms to prevent jank during slider dragging.
2. **Regional swing:** Milwaukee Metro (Milwaukee, Waukesha, Ozaukee, Washington counties), Madison Metro (Dane), Fox Valley (Brown, Outagamie, Winnebago, Calumet), Rural (all others). Defined in `regionMapping.ts`.
3. **Urban/rural classification:** Density-based: urban (>3000/sq mi), suburban (500-3000), rural (<500). Falls back to region mapping if density unavailable. Used for demographic swing and demographic turnout.
4. **URL state sync:** `useModelerUrlState` reads/writes all parameters to URL search params for sharing.
5. **Scenario presets:** Defined in `scenarioPresets.ts`. Each preset sets specific parameter values.
6. **Aggregation:** `aggregatePredictions.ts` groups predictions by county, CD, SD, AD using ward metadata.
7. **Baseline shift:** Results panel shows shift from the base election (e.g., "D+2.3 shift from baseline").
8. **Reset button:** Disabled when all parameters equal their default values.
9. **Differential turnout:** `effectiveTurnout = statewide + regionOffset + classificationOffset`. Additive stacking. All model types support both regional and demographic turnout offsets; the UI controls which sliders are visible per model type.
10. **MRP turnout:** MRP model handles turnout server-side. Differential turnout sliders are hidden when MRP is selected.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Ward has no data for base election | Fallback to most recent election of same type. If none, predict 50/50 with confidence 0 |
| MRP model not fitted | Status shows "No fitted model". Predict endpoint returns 404 |
| MRP fitting in progress | Polling indicator with progress bar |
| All sliders at zero | Map shows actual baseline results unchanged |
| Extreme swing (D+15 or R+15) | Ward predictions clamped to 1-99% range |

---

## Files

| File | Purpose |
|------|---------|
| `features/swing-modeler/index.tsx` | Page component — orchestrates map, controls, results |
| `features/swing-modeler/components/ControlsPanel.tsx` | Left sidebar: model selector, sliders, presets |
| `features/swing-modeler/components/ResultsSummary.tsx` | Projected winner, vote totals, aggregation tables |
| `features/swing-modeler/components/UncertaintyOverlay.tsx` | Confidence band info panel |
| `features/swing-modeler/components/MrpStatus.tsx` | MRP model status and fitting controls |
| `features/swing-modeler/model.worker.ts` | Web Worker: uniform, proportional, demographic models |
| `features/swing-modeler/lib/aggregatePredictions.ts` | Group predictions by county/district |
| `features/swing-modeler/lib/computeUncertainty.ts` | Confidence band computation |
| `features/swing-modeler/lib/scenarioPresets.ts` | Pre-built scenario parameter sets |
| `features/swing-modeler/hooks/useModelData.ts` | Converts map data → WardData[] for modeling |
| `features/swing-modeler/hooks/useModelerUrlState.ts` | URL ↔ store parameter sync |
| `stores/modelStore.ts` | Zustand: activeModelId, parameters, predictions, isComputing |
| `models/registry.ts` | Plugin registry for model implementations |
| `models/types.ts` | ModelParameter, ElectionModel interfaces |
| `shared/lib/regionMapping.ts` | Region classification: county → region mapping |
