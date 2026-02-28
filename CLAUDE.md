# CLAUDE.md — Wisconsin Election Modeling App (WI-Vote)

## Project Identity

**Name:** WI-Vote — Wisconsin Ward-Level Election Modeling App
**Type:** React web application with Python FastAPI backend
**Goal:** Allow any Wisconsin resident to look up how their ward voted, explore any ward in the state, see partisan trends over time, and model future statewide race outcomes by adjusting voting variables.

---

## Architecture Overview

This is a monorepo with two main packages:

```
wi-vote/
├── CLAUDE.md                    # This file — project spec and context
├── README.md
├── docker-compose.yml
├── .env.example
├── packages/
│   ├── client/                  # React frontend
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── index.html
│   │   ├── public/
│   │   │   └── tiles/           # PMTiles ward boundary files
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── routes/
│   │       ├── features/        # Feature-based modules (see below)
│   │       ├── shared/          # Shared components, hooks, utils
│   │       ├── stores/          # Zustand stores
│   │       ├── services/        # API clients, data adapters
│   │       ├── models/          # Election model implementations
│   │       ├── types/           # Shared TypeScript types
│   │       └── plugins/         # Plugin registry system
│   └── server/                  # Python FastAPI backend
│       ├── pyproject.toml
│       ├── app/
│       │   ├── main.py
│       │   ├── api/
│       │   │   └── v1/
│       │   ├── models/          # SQLAlchemy/Pydantic models
│       │   ├── services/        # Business logic
│       │   ├── election_models/ # Python modeling engines
│       │   └── data/            # Data ingestion scripts
│       └── tests/
├── data/                        # Raw data downloads and processing
│   ├── raw/                     # Downloaded shapefiles, CSVs
│   ├── processed/               # Cleaned, normalized data
│   └── scripts/                 # ETL scripts
└── docs/                        # Additional documentation
```

---

## Tech Stack (Do Not Deviate)

### Frontend
| Concern | Technology | Version |
|---------|-----------|---------|
| Framework | React + TypeScript | React 19, TS 5.x |
| Build | Vite | 6.x |
| Routing | React Router | v7 |
| Maps | MapLibre GL JS | v4+ |
| Map React wrapper | react-map-gl (MapLibre mode) | v7+ |
| Data overlays | deck.gl | v9+ |
| Vector tiles | PMTiles | via protomaps-themes-base |
| Charts | Recharts | v2+ |
| Custom viz | Visx (D3-based) | Latest |
| Server state | TanStack Query | v5 |
| Client state | Zustand | v5 |
| Styling | Tailwind CSS | v4 |
| UI components | shadcn/ui | Latest |
| Color scales | chroma-js | Latest |
| Geo utilities | @turf/turf | Latest |

### Backend
| Concern | Technology |
|---------|-----------|
| Framework | FastAPI |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| ORM | SQLAlchemy 2.0 + GeoAlchemy2 |
| Validation | Pydantic v2 |
| Geo processing | GeoPandas, Shapely, Fiona |
| Modeling | NumPy, Pandas, scikit-learn |
| Future Bayesian | PyMC / Stan (Phase 4) |
| Task queue | Celery + Redis (when needed) |
| Migrations | Alembic |

### Infrastructure
| Concern | Technology |
|---------|-----------|
| Containerization | Docker + Docker Compose |
| Tile hosting | Static files (Cloudflare R2 or S3) |
| Tile generation | Tippecanoe → PMTiles |
| Free base map tiles | Protomaps or MapTiler free tier |

---

## Data Sources (Ranked by Priority)

### 1. LTSB ArcGIS Open Data Portal (PRIMARY)
- **URL:** https://data-ltsb.opendata.arcgis.com
- **What:** Ward boundary shapefiles with election results pre-joined
- **Coverage:** 1990–2024, mapped to multiple ward vintages (2011, 2017, 2018, 2020, 2022)
- **Formats:** Shapefile, GeoJSON, CSV, KML, via ArcGIS REST Feature Service
- **Key datasets:**
  - `2012-2020 Election Data (with 2020 Wards)` — use 2020 wards as the canonical boundary vintage
  - `1990-2000 Election Data (with 2020 Wards)` — historical data on modern boundaries
  - `2022 Election Data (with 2022 Wards)` — latest ward boundaries post-redistricting
- **API:** ArcGIS REST endpoints support `?where=1=1&outFields=*&f=geojson` queries
- **IMPORTANT:** LTSB has already done the hard work of disaggregating reporting units to true ward-level and re-aggregating to consistent ward vintages. Use their pre-processed data.

### 2. Wisconsin Elections Commission (WEC)
- **URL:** https://elections.wi.gov/elections/election-results
- **What:** Official certified results as Excel downloads
- **Limitation:** Reports at "reporting unit" level (not ward), no API
- **Use for:** Verification, newest results not yet in LTSB

### 3. Redistricting Data Hub
- **URL:** https://redistrictingdatahub.org/state/wisconsin/
- **What:** 2024 general election data joined to ward boundaries (free with account)
- **Use for:** Most current election data

### 4. OpenElections
- **URL:** https://github.com/openelections/openelections-data-wi
- **What:** Standardized CSVs from 2000+, county and ward level
- **Use for:** Supplemental tabular data, cross-validation

### 5. MGGG Wisconsin Shapefiles
- **URL:** https://github.com/mggg-states/WI-shapefiles
- **What:** Topology-corrected ward boundaries with 2012–2018 election data
- **Use for:** Clean geometric rendering, backup shapefile source

### 6. US Census / ACS Data
- **URL:** https://data.census.gov
- **What:** Demographics at block group/tract level
- **Use for:** Demographic regression models (Phase 3+), population data for turnout estimates

---

## Critical Data Concepts

### The Reporting Unit Problem
Wisconsin has 1,927 municipal clerks who create "reporting units" with no standardization. A reporting unit might be a single ward ("City of Milwaukee Ward 123") or a combination ("Town of Westport Wards 1-4"). LTSB solves this through disaggregation using Census block population data. **Ward-level results from combined reporting units are population-weighted estimates, not direct counts.** County and state totals remain exact.

**Implication for the app:** Always disclose that ward-level figures in combined reporting units are estimates. Display a confidence indicator or footnote per ward.

### Ward Boundary Vintages
Ward boundaries change after each decennial Census and through ongoing municipal annexations. LTSB provides the same election data mapped to different ward boundary sets. **Use the 2020 ward vintage as the canonical geography** for all longitudinal analysis.

After the 2020 Census, Wisconsin adopted new ward boundaries (2022 wards). For elections 2022+, use the 2022 ward vintage. Build a boundary-vintage switcher so users can toggle between eras if needed.

### Ward-to-District Nesting
By Wisconsin statute, a single ward cannot cross congressional, state senate, assembly, or county supervisory district boundaries. This means aggregating ward → district is a simple GROUP BY, not a spatial overlay. Store the district assignments as ward attributes.

---

## Feature Modules

Each feature is a self-contained module under `packages/client/src/features/`:

### `ward-explorer/` — Ward Lookup & Detail View
- Address geocoding → ward identification via reverse geocode + spatial query
- Interactive MapLibre choropleth map of all ~7,000 wards
- Click any ward to see: name, municipality, county, all district assignments
- Election results table for all available elections for that ward
- Vote totals, percentages, margin, turnout (if available)
- Compare selected ward to county/state averages
- Ward-level "partisan lean" metric (average D/R margin across recent elections)

### `election-map/` — Statewide Election Visualization
- Full-screen MapLibre map with ward-level choropleth
- Election selector: year + race type (president, governor, US senate, state senate, assembly)
- Diverging red-blue color scale (ColorBrewer RdBu, 7-9 bins, centered at 50%)
- Dynamic legend showing bin ranges and ward counts per bin
- Toggle between: vote margin, D%, R%, turnout, raw vote count
- Election-to-election comparison mode (side-by-side or difference map)
- MapLibre `setFeatureState` for sub-100ms election switching (geometry stays on GPU)

### `trends/` — Partisan Trend Analysis
- Time series charts (Recharts) showing ward-level D/R margin over time
- Trend classification: "Getting more Democratic", "Getting more Republican", "Inconclusive"
- Trend calculated via linear regression on D margin across available elections
- Statistical significance indicator (p-value < 0.05 for classification)
- Aggregate trends by: municipality, county, assembly district, senate district, congressional district
- Small multiples view: grid of trend sparklines for all wards in a selected area

### `swing-modeler/` — What-If Election Modeling
- Uniform swing slider: adjust statewide D/R margin from -15 to +15 points
- Map updates in real-time as slider moves (Web Worker for computation)
- Results panel shows: projected winner, margin, vote totals at ward/county/district/state level
- Proportional swing toggle (multiplicative vs additive)
- Turnout adjustment slider (uniform % change to all wards)
- Regional swing: separate sliders for Milwaukee metro, Madison metro, Fox Valley, rural WI, etc.
- Pre-built scenarios: "2020 electorate", "2016 electorate", "high turnout", "low turnout"
- Save/share custom scenarios via URL parameters

### `data-manager/` — Admin & Data Ingestion (internal)
- Scripts to download and process LTSB data
- Data validation and quality checks
- Ward boundary tile generation pipeline (Tippecanoe → PMTiles)
- Election data normalization and loading

---

## Plugin System Architecture

### Model Plugin Interface
```typescript
// packages/client/src/models/types.ts

export interface ModelParameter {
  id: string;
  label: string;
  type: 'slider' | 'select' | 'toggle' | 'number';
  min?: number;
  max?: number;
  step?: number;
  defaultValue: number | string | boolean;
  options?: { label: string; value: string }[];
  description?: string;
  group?: string; // For grouping parameters in the UI
}

export interface WardData {
  wardId: string;
  wardName: string;
  municipality: string;
  county: string;
  // District assignments
  congressionalDistrict: string;
  stateSenateDistrict: string;
  assemblyDistrict: string;
  // Election history
  elections: ElectionResult[];
  // Demographics (Phase 3+)
  demographics?: DemographicData;
}

export interface ElectionResult {
  year: number;
  raceType: RaceType;
  demVotes: number;
  repVotes: number;
  otherVotes: number;
  totalVotes: number;
  demPct: number;
  repPct: number;
  margin: number; // positive = D, negative = R
  isEstimate: boolean; // true if from disaggregated reporting unit
}

export type RaceType =
  | 'president'
  | 'governor'
  | 'us_senate'
  | 'us_house'
  | 'state_senate'
  | 'state_assembly'
  | 'attorney_general'
  | 'secretary_of_state'
  | 'treasurer';

export interface Prediction {
  wardId: string;
  predictedDemPct: number;
  predictedRepPct: number;
  predictedMargin: number;
  predictedDemVotes: number;
  predictedRepVotes: number;
  predictedTotalVotes: number;
  confidence?: number; // 0-1
}

export interface UncertaintyBand {
  wardId: string;
  lowerDemPct: number;
  upperDemPct: number;
  lowerMargin: number;
  upperMargin: number;
}

export interface ElectionModel {
  id: string;
  name: string;
  description: string;
  version: string;
  parameters: ModelParameter[];
  predict(wardData: WardData[], params: Record<string, any>): Prediction[];
  getUncertainty?(wardData: WardData[], params: Record<string, any>): UncertaintyBand[];
  validate?(wardData: WardData[]): { valid: boolean; errors: string[] };
}
```

### Model Registry
```typescript
// packages/client/src/models/registry.ts

class ModelRegistry {
  private models = new Map<string, ElectionModel>();

  register(model: ElectionModel): void {
    this.models.set(model.id, model);
  }

  get(id: string): ElectionModel | undefined {
    return this.models.get(id);
  }

  getAll(): ElectionModel[] {
    return Array.from(this.models.values());
  }
}

export const modelRegistry = new ModelRegistry();
```

### Uniform Swing Model Implementation
```typescript
// packages/client/src/models/uniform-swing.ts

import { ElectionModel, WardData, Prediction, ModelParameter } from './types';

export const uniformSwingModel: ElectionModel = {
  id: 'uniform-swing',
  name: 'Uniform Swing',
  description: 'Applies a constant vote share adjustment to every ward based on the previous election.',
  version: '1.0.0',
  parameters: [
    {
      id: 'baseElectionYear',
      label: 'Base Election',
      type: 'select',
      defaultValue: '2024',
      options: [], // Populated dynamically from available elections
      description: 'The election to use as the baseline for projections',
    },
    {
      id: 'baseRaceType',
      label: 'Base Race',
      type: 'select',
      defaultValue: 'president',
      options: [
        { label: 'President', value: 'president' },
        { label: 'Governor', value: 'governor' },
        { label: 'US Senate', value: 'us_senate' },
        { label: 'State Senate', value: 'state_senate' },
        { label: 'State Assembly', value: 'state_assembly' },
      ],
    },
    {
      id: 'swingPoints',
      label: 'Statewide Swing (D+)',
      type: 'slider',
      min: -15,
      max: 15,
      step: 0.1,
      defaultValue: 0,
      description: 'Positive = more Democratic, Negative = more Republican',
    },
    {
      id: 'turnoutChange',
      label: 'Turnout Change (%)',
      type: 'slider',
      min: -30,
      max: 30,
      step: 1,
      defaultValue: 0,
      description: 'Uniform percentage change in turnout across all wards',
    },
  ],

  predict(wardData: WardData[], params: Record<string, any>): Prediction[] {
    const { baseElectionYear, baseRaceType, swingPoints, turnoutChange } = params;

    return wardData.map((ward) => {
      const baseElection = ward.elections.find(
        (e) => e.year === Number(baseElectionYear) && e.raceType === baseRaceType
      );

      if (!baseElection) {
        // Fallback: use most recent election of same type
        const fallback = ward.elections
          .filter((e) => e.raceType === baseRaceType)
          .sort((a, b) => b.year - a.year)[0];

        if (!fallback) {
          return {
            wardId: ward.wardId,
            predictedDemPct: 50,
            predictedRepPct: 50,
            predictedMargin: 0,
            predictedDemVotes: 0,
            predictedRepVotes: 0,
            predictedTotalVotes: 0,
            confidence: 0,
          };
        }
      }

      const election = baseElection!;
      const swing = swingPoints / 100; // Convert to decimal
      const turnoutMultiplier = 1 + turnoutChange / 100;

      // Apply uniform swing to two-party vote share
      const baseDemTwoParty = election.demVotes / (election.demVotes + election.repVotes);
      const adjustedDemTwoParty = Math.max(0.01, Math.min(0.99, baseDemTwoParty + swing));

      // Apply turnout adjustment
      const projectedTotal = Math.round(election.totalVotes * turnoutMultiplier);
      const twoPartyTotal = Math.round(
        (election.demVotes + election.repVotes) * turnoutMultiplier
      );
      const otherVotes = projectedTotal - twoPartyTotal;

      const projectedDem = Math.round(twoPartyTotal * adjustedDemTwoParty);
      const projectedRep = twoPartyTotal - projectedDem;

      return {
        wardId: ward.wardId,
        predictedDemPct: (projectedDem / projectedTotal) * 100,
        predictedRepPct: (projectedRep / projectedTotal) * 100,
        predictedMargin: ((projectedDem - projectedRep) / projectedTotal) * 100,
        predictedDemVotes: projectedDem,
        predictedRepVotes: projectedRep,
        predictedTotalVotes: projectedTotal,
        confidence: 0.7, // Base confidence for uniform swing
      };
    });
  },
};
```

### Race Plugin Interface
```typescript
// packages/client/src/plugins/types.ts

export interface RacePlugin {
  id: RaceType;
  label: string;
  shortLabel: string;
  description: string;
  availableYears: number[];
  color: string; // Brand color for this race type in UI
  icon?: string;
  aggregationLevel: 'statewide' | 'congressional' | 'state_senate' | 'state_assembly';
  component: React.LazyExoticComponent<React.ComponentType>;
}
```

---

## Database Schema

```sql
-- Core geographic tables
CREATE TABLE wards (
    id SERIAL PRIMARY KEY,
    ward_id VARCHAR(50) UNIQUE NOT NULL, -- e.g., "MIL-W-123" or LTSB identifier
    ward_name VARCHAR(255) NOT NULL,
    municipality VARCHAR(255) NOT NULL,
    municipality_type VARCHAR(20), -- city, village, town
    county VARCHAR(100) NOT NULL,
    congressional_district VARCHAR(10),
    state_senate_district VARCHAR(10),
    assembly_district VARCHAR(10),
    county_supervisory_district VARCHAR(10),
    ward_vintage INTEGER NOT NULL, -- 2011, 2017, 2020, 2022
    geom GEOMETRY(MultiPolygon, 4326) NOT NULL,
    area_sq_miles FLOAT,
    is_estimated BOOLEAN DEFAULT FALSE, -- True if from disaggregated reporting unit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_wards_geom ON wards USING GIST(geom);
CREATE INDEX idx_wards_vintage ON wards(ward_vintage);
CREATE INDEX idx_wards_county ON wards(county);
CREATE INDEX idx_wards_municipality ON wards(municipality);

-- Election results
CREATE TABLE election_results (
    id SERIAL PRIMARY KEY,
    ward_id VARCHAR(50) REFERENCES wards(ward_id),
    election_year INTEGER NOT NULL,
    election_date DATE,
    race_type VARCHAR(50) NOT NULL, -- president, governor, us_senate, etc.
    race_name VARCHAR(255), -- Full race name for display
    dem_candidate VARCHAR(255),
    rep_candidate VARCHAR(255),
    dem_votes INTEGER NOT NULL DEFAULT 0,
    rep_votes INTEGER NOT NULL DEFAULT 0,
    other_votes INTEGER NOT NULL DEFAULT 0,
    total_votes INTEGER NOT NULL DEFAULT 0,
    dem_pct FLOAT GENERATED ALWAYS AS (
        CASE WHEN total_votes > 0 THEN dem_votes::FLOAT / total_votes * 100 ELSE 0 END
    ) STORED,
    rep_pct FLOAT GENERATED ALWAYS AS (
        CASE WHEN total_votes > 0 THEN rep_votes::FLOAT / total_votes * 100 ELSE 0 END
    ) STORED,
    margin FLOAT GENERATED ALWAYS AS (
        CASE WHEN total_votes > 0 THEN (dem_votes - rep_votes)::FLOAT / total_votes * 100 ELSE 0 END
    ) STORED,
    is_estimate BOOLEAN DEFAULT FALSE,
    reporting_unit_name VARCHAR(500), -- Original reporting unit string
    data_source VARCHAR(100), -- 'ltsb', 'wec', 'openelections', etc.
    ward_vintage INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_results_ward ON election_results(ward_id);
CREATE INDEX idx_results_year_race ON election_results(election_year, race_type);
CREATE INDEX idx_results_vintage ON election_results(ward_vintage);
CREATE UNIQUE INDEX idx_results_unique ON election_results(ward_id, election_year, race_type, ward_vintage);

-- Ward trend analysis (pre-computed)
CREATE TABLE ward_trends (
    id SERIAL PRIMARY KEY,
    ward_id VARCHAR(50) REFERENCES wards(ward_id),
    race_type VARCHAR(50) NOT NULL,
    trend_direction VARCHAR(20), -- 'more_democratic', 'more_republican', 'inconclusive'
    trend_slope FLOAT, -- Linear regression slope (margin change per election cycle)
    trend_r_squared FLOAT, -- R² of the linear fit
    trend_p_value FLOAT, -- Statistical significance
    elections_analyzed INTEGER, -- Number of elections in the regression
    start_year INTEGER,
    end_year INTEGER,
    ward_vintage INTEGER NOT NULL,
    computed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trends_ward ON ward_trends(ward_id);
CREATE INDEX idx_trends_direction ON ward_trends(trend_direction);

-- Demographics (Phase 3)
CREATE TABLE ward_demographics (
    id SERIAL PRIMARY KEY,
    ward_id VARCHAR(50) REFERENCES wards(ward_id),
    census_year INTEGER, -- 2020
    total_population INTEGER,
    voting_age_population INTEGER,
    -- Race/ethnicity
    white_pct FLOAT,
    black_pct FLOAT,
    hispanic_pct FLOAT,
    asian_pct FLOAT,
    -- Education (ACS estimates)
    college_degree_pct FLOAT,
    -- Income (ACS estimates)
    median_household_income INTEGER,
    -- Urban/rural classification
    urban_rural_class VARCHAR(20), -- 'urban', 'suburban', 'rural'
    population_density FLOAT, -- per sq mile
    ward_vintage INTEGER NOT NULL,
    data_source VARCHAR(100)
);
```

---

## API Endpoints

```
# Ward data
GET  /api/v1/wards                          # List all wards (paginated, filterable)
GET  /api/v1/wards/:wardId                  # Single ward with all elections
GET  /api/v1/wards/geocode?lat=X&lng=Y      # Find ward by coordinates
GET  /api/v1/wards/search?q=term            # Search wards by name/municipality

# Election data
GET  /api/v1/elections                       # List available elections (years + race types)
GET  /api/v1/elections/:year/:raceType       # All ward results for a specific election
GET  /api/v1/elections/map-data/:year/:raceType  # GeoJSON with results pre-joined (for map rendering)

# Aggregations
GET  /api/v1/aggregations/county/:county/:year/:raceType
GET  /api/v1/aggregations/district/:districtType/:districtId/:year/:raceType
GET  /api/v1/aggregations/statewide/:year/:raceType

# Trends
GET  /api/v1/trends/ward/:wardId             # Trend data for a specific ward
GET  /api/v1/trends/area?county=X            # Aggregated trends for an area
GET  /api/v1/trends/classify                 # Bulk trend classification for all wards

# Modeling (Phase 2+)
POST /api/v1/models/predict                  # Run a model with given parameters
GET  /api/v1/models/available                # List available models and their parameters
POST /api/v1/models/scenarios                # Save a scenario
GET  /api/v1/models/scenarios/:id            # Load a saved scenario
```

---

## Map Rendering Pipeline

### Tile Generation (Build-Time)
```bash
# 1. Download ward boundaries from LTSB (GeoJSON)
ogr2ogr -f GeoJSON wards_2020.geojson \
  "https://data-ltsb.opendata.arcgis.com/..." \
  -t_srs EPSG:4326

# 2. Simplify and strip unnecessary properties
ogr2ogr -f GeoJSON wards_clean.geojson wards_2020.geojson \
  -select ward_id,ward_name,municipality,county,cd,sd,ad

# 3. Generate vector tiles with Tippecanoe
tippecanoe -o wards.mbtiles \
  --maximum-zoom=14 \
  --minimum-zoom=4 \
  --simplification=10 \
  --detect-shared-borders \
  --coalesce-densest-as-needed \
  --extend-zooms-if-still-dropping \
  --force \
  --layer=wards \
  --named-layer=wards:wards_clean.geojson

# 4. Convert to PMTiles for serverless hosting
pmtiles convert wards.mbtiles wards.pmtiles

# 5. Upload to static storage (Cloudflare R2, S3, etc.)
# Or serve from public/tiles/ during development
```

### Runtime Map Rendering
```typescript
// Use MapLibre GL JS with PMTiles protocol
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';

// Register PMTiles protocol
const protocol = new Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

// Add ward source
map.addSource('wards', {
  type: 'vector',
  url: 'pmtiles:///tiles/wards.pmtiles',
});

// Add choropleth layer
map.addLayer({
  id: 'ward-fills',
  type: 'fill',
  source: 'wards',
  'source-layer': 'wards',
  paint: {
    'fill-color': [
      'case',
      ['!=', ['feature-state', 'demPct'], null],
      [
        'interpolate',
        ['linear'],
        ['feature-state', 'demPct'],
        30, '#b2182b',  // Strong R
        40, '#ef8a62',  // Lean R
        45, '#fddbc7',  // Tilt R
        50, '#f7f7f7',  // Even
        55, '#d1e5f0',  // Tilt D
        60, '#67a9cf',  // Lean D
        70, '#2166ac',  // Strong D
      ],
      '#cccccc', // No data
    ],
    'fill-opacity': 0.75,
  },
});

// Dynamic data binding via setFeatureState (no geometry re-upload!)
function updateElectionData(electionResults: Map<string, number>) {
  electionResults.forEach((demPct, wardId) => {
    map.setFeatureState(
      { source: 'wards', sourceLayer: 'wards', id: wardId },
      { demPct }
    );
  });
}
```

---

## State Management

### Zustand Stores
```typescript
// packages/client/src/stores/mapStore.ts
interface MapState {
  viewport: { center: [number, number]; zoom: number };
  selectedWardId: string | null;
  hoveredWardId: string | null;
  activeElection: { year: number; raceType: RaceType } | null;
  displayMetric: 'margin' | 'demPct' | 'repPct' | 'turnout' | 'totalVotes';
  compareMode: boolean;
  compareElection: { year: number; raceType: RaceType } | null;
  // Actions
  setSelectedWard: (wardId: string | null) => void;
  setActiveElection: (year: number, raceType: RaceType) => void;
  setDisplayMetric: (metric: string) => void;
  toggleCompareMode: () => void;
}

// packages/client/src/stores/modelStore.ts
interface ModelState {
  activeModelId: string;
  parameters: Record<string, any>;
  predictions: Prediction[] | null;
  isComputing: boolean;
  // Actions
  setActiveModel: (modelId: string) => void;
  setParameter: (paramId: string, value: any) => void;
  setPredictions: (predictions: Prediction[]) => void;
}
```

### TanStack Query Keys
```typescript
// Consistent query key factory
export const queryKeys = {
  wards: {
    all: ['wards'] as const,
    detail: (wardId: string) => ['wards', wardId] as const,
    geocode: (lat: number, lng: number) => ['wards', 'geocode', lat, lng] as const,
    search: (query: string) => ['wards', 'search', query] as const,
  },
  elections: {
    all: ['elections'] as const,
    results: (year: number, race: RaceType) => ['elections', year, race] as const,
    mapData: (year: number, race: RaceType) => ['elections', 'map', year, race] as const,
  },
  trends: {
    ward: (wardId: string) => ['trends', wardId] as const,
    area: (filters: Record<string, string>) => ['trends', 'area', filters] as const,
  },
};
```

---

## Performance Requirements

- **Initial page load:** < 3 seconds on 4G connection
- **Ward tile load (state view):** < 500 KB initial, progressive detail on zoom
- **Election data switching:** < 100ms (via `setFeatureState`, no geometry re-upload)
- **Model computation (7,000 wards):** < 200ms (Web Worker)
- **Ward click → detail panel:** < 50ms
- **Search → results:** < 300ms
- **Geocode → ward identification:** < 500ms

---

## Build Phases

### Phase 1: Foundation + Static Map (Weeks 1-6)
**Goal:** Ward map with historical election results, ward lookup.

Tasks:
1. Set up monorepo with Vite + React + TypeScript + Tailwind
2. Set up FastAPI + PostgreSQL + PostGIS with Docker Compose
3. Write data ingestion scripts for LTSB ArcGIS data (2020 ward vintage, all available elections)
4. Generate PMTiles from ward boundaries via Tippecanoe
5. Build MapLibre choropleth with ward polygons
6. Build election year/race selector dropdown
7. Implement `setFeatureState` for dynamic election switching
8. Build ward detail sidebar (click ward → show all elections)
9. Build address search → geocode → ward identification
10. Build basic ward search by name/municipality
11. Deploy as static frontend + API backend

**Definition of Done:** User can view a map of all ~7,000 Wisconsin wards colored by election results, switch between any available election, click any ward to see its full election history, and search for wards by name or address.

### Phase 2: Modeling + Trends (Weeks 7-12)
**Goal:** Uniform swing modeling and partisan trend analysis.

Tasks:
1. Implement uniform swing model (client-side, Web Worker)
2. Build swing slider UI with real-time map updates
3. Implement proportional swing as second model
4. Build turnout adjustment slider
5. Build results summary panel (projected winner, margins at all aggregation levels)
6. Compute ward-level trends via linear regression (backend batch job)
7. Build trend classification logic (more D, more R, inconclusive)
8. Build Recharts time series for ward trends
9. Build trend map overlay (color by trend direction/magnitude)
10. Add regional swing sliders (Milwaukee, Madison, Fox Valley, rural)
11. Add pre-built scenario presets
12. Add URL parameter encoding for sharing scenarios

**Definition of Done:** User can adjust swing sliders and see the map update in real-time with projected results. User can view trend charts showing how any ward has shifted over time.

### Phase 3: Advanced Features (Weeks 13-20)
**Goal:** Demographic regression, comparison views, PWA.

Tasks:
1. Ingest Census/ACS demographic data at ward level
2. Build demographic regression model (urban/suburban/rural differential swing)
3. Build side-by-side election comparison view
4. Build difference map (Election A minus Election B)
5. Build small multiples view for trend sparklines
6. Add urban/suburban/rural differential swing sliders
7. Implement PWA manifest + service worker for offline caching
8. Add ward-level uncertainty visualization (confidence bands)
9. Performance optimization pass (bundle splitting, tile caching)
10. Accessibility audit and improvements

### Phase 4: Future Enhancements (Ongoing)
- Server-side MRP (multilevel regression with poststratification) model via PyMC/Stan
- Real-time election night data integration
- Voter registration data overlay
- Historical ward boundary animation (show how boundaries changed)
- Community features (user-submitted notes, local knowledge)
- Mobile app via Capacitor (if app store presence needed)

---

## Coding Standards

### TypeScript
- Strict mode enabled
- No `any` types except in explicit escape hatches documented with comments
- Use discriminated unions for state variants
- Prefer `interface` for object shapes, `type` for unions/intersections
- All API responses typed with Pydantic → OpenAPI → generated TypeScript types

### React
- Functional components only
- Custom hooks for all data fetching and business logic
- `React.memo` for expensive render components (map layers, chart components)
- `React.lazy` + `Suspense` for feature module code splitting
- Error boundaries around each feature module

### Python
- Type hints on all functions
- Pydantic models for all API request/response schemas
- async/await for all I/O operations
- Pytest for testing with fixtures for database state

### Git
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- Feature branches off `main`
- Each phase is a milestone with issues

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/wivote
POSTGRES_PASSWORD=password

# Map tiles
VITE_MAPTILER_KEY=your_key_here  # Free tier: 100k tiles/month
VITE_TILE_URL=/tiles/wards.pmtiles  # Local dev, or CDN URL for prod

# API
VITE_API_URL=http://localhost:8000
API_CORS_ORIGINS=http://localhost:5173

# Geocoding
CENSUS_GEOCODER_URL=https://geocoding.geo.census.gov/geocoder

# Feature flags
VITE_FF_DEMOGRAPHIC_MODEL=false
VITE_FF_MRP_MODEL=false
VITE_FF_COMPARISON_VIEW=false
VITE_FF_PWA=false
```

---

## Key Design Decisions (Do Not Revisit)

1. **MapLibre GL JS over Leaflet** — WebGL required for 7,000 polygons at 60fps
2. **PMTiles over tile server** — Serverless, CDN-cacheable, no infrastructure
3. **2020 ward vintage as canonical** — Best coverage, most data mapped to it
4. **Client-side modeling (Phase 1-2)** — Uniform/proportional swing is fast enough in-browser
5. **Server-side modeling (Phase 4+)** — MRP/Bayesian requires Python scientific stack
6. **TanStack Query + Zustand over Redux** — Less boilerplate, better separation of concerns
7. **Feature-based folder structure** — Each feature is independently loadable/testable
8. **Plugin registry pattern** — New models/races register without modifying core code
9. **PWA over React Native for mobile** — 100% code reuse, WebGL maps work great in mobile browsers
10. **PostgreSQL + PostGIS** — Spatial queries for geocoding, aggregation, and future analysis

---

## Testing Strategy

- **Unit tests:** Model implementations, data transformations, utility functions (Vitest)
- **Component tests:** Feature components with mocked data (Testing Library)
- **Integration tests:** API endpoints with test database (Pytest + httpx)
- **E2E tests:** Critical user flows — ward lookup, election switching, modeling (Playwright)
- **Visual regression:** Map rendering at key zoom levels (Playwright screenshots)
- **Data validation:** Automated checks that ward totals sum to county totals, county to state

---

## Important Notes for Claude Code

1. **Start with data.** Before building any UI, ensure the data pipeline works: download LTSB data, load into PostGIS, generate PMTiles. The app is only as good as its data.

2. **The LTSB ArcGIS REST API is your friend.** You can query it directly: `https://data-ltsb.opendata.arcgis.com/datasets/[dataset-id]/FeatureServer/0/query?where=1=1&outFields=*&f=geojson`. Use this for initial prototyping before building a full ETL pipeline.

3. **Ward IDs must be stable across the app.** LTSB uses different ID schemes across datasets. Establish a canonical ward ID format early (e.g., `{COUNTY_FIPS}-{MUNICIPALITY}-{WARD_NUM}`) and map everything to it.

4. **Test with Milwaukee County first.** It has the most wards (~350) and the most complex reporting unit disaggregation. If it works for Milwaukee, it works everywhere.

5. **Color scale matters enormously.** Use ColorBrewer RdBu diverging palette via chroma-js. Center at 50% (not at the median). 7 bins minimum. Test with colorblind simulation.

6. **The reporting unit disclosure is not optional.** Any ward whose data comes from a multi-ward reporting unit must be flagged. This is an integrity issue.

7. **Pre-compute everything you can.** Trends, partisan lean scores, ward metadata — compute at data load time, not at request time. The backend should serve pre-computed results for common queries.

8. **Web Workers for model computation.** Even uniform swing across 7,000 wards takes enough time to cause UI jank if run on the main thread. Always use a Web Worker.

9. **URL-driven state.** Election year, race type, selected ward, model parameters — all should be reflected in the URL so users can share specific views.

10. **Iterate in this order:** Data pipeline → Map rendering → Ward detail → Election switching → Trends → Modeling. Each step builds on the last and is independently testable.

11. **Post-push TODO summary.** After every `git push` to GitHub, review the Build Phases above against what has been implemented and print a concise checklist of remaining TODO items, organized by phase. Mark completed items with checkmarks and incomplete items with empty boxes. Only include phases that have remaining work.

---

## Known Railway Deployment Issues

### Nginx DNS Caching (Critical)
**Problem:** Nginx resolves the API upstream hostname (`api.railway.internal`) once at startup and caches the IP indefinitely. When the API service restarts on Railway, it gets a new internal IP. The client's nginx keeps routing to the dead IP, causing 504 timeouts on all API requests. The app appears partially functional because the PWA service worker serves cached data for previously-visited pages.

**Fix (implemented):** The nginx config uses `resolver [fd12::10] ipv6=on valid=5s;` (Railway's internal IPv6 DNS server) with a `set $api_upstream` variable so nginx re-resolves the hostname every 5 seconds instead of caching forever. The `DNS_RESOLVER` env var defaults to `[fd12::10]` in the Dockerfile, with a fallback to `/etc/resolv.conf` for local Docker Compose.

**Files:**
- `packages/client/nginx.conf` — `resolver` directive at server level + variable-based `proxy_pass`
- `packages/client/Dockerfile` — `ENV DNS_RESOLVER=[fd12::10]` + CMD envsubst pipeline

**Key detail:** Railway uses IPv6 networking internally. The DNS resolver is `fd12::10` (not a standard IPv4 nameserver). The `ipv6=on` flag is required. The `resolver` directive must be at the `server` level (not inside `location`) so the `set $api_upstream` variable benefits from DNS re-resolution.

**Fallback:** If the dynamic resolver fails, manually restart the client service on Railway to force nginx to re-resolve DNS.

### Service Worker Caching Error Responses
**Problem:** The workbox `NetworkFirst` strategy cached HTTP error responses (504, 500). When the API was temporarily unavailable during a deploy, the 504 response was cached. Subsequent requests served the cached 504 even after the API recovered.

**Fix (implemented):** Added `cacheableResponse: { statuses: [0, 200] }` to all workbox runtime caching rules so only successful responses are cached. Also added `skipWaiting: true` so new service workers activate immediately instead of waiting for all tabs to close.

**Files:**
- `packages/client/vite.config.ts` — workbox `cacheableResponse` + `skipWaiting` config
