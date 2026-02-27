# WI-Vote — Wisconsin Ward-Level Election Modeling App

A React + FastAPI application for exploring how Wisconsin's ~7,000 wards vote, viewing partisan trends over time, and modeling future statewide race outcomes.

## Prerequisites

- Node.js 20+
- Python 3.12+
- Docker + Docker Compose (for PostgreSQL/PostGIS and Redis)

## Quick Start

### 1. Clone and configure

```bash
cp .env.example .env
# Edit .env with your settings
```

### 2. Start infrastructure

```bash
docker compose up -d
```

### 3. Start the backend

```bash
cd packages/server
python -m venv .venv
source .venv/Scripts/activate  # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

API available at http://localhost:8000 (Swagger docs at `/docs`).

### 4. Start the frontend

```bash
cd packages/client
npm install
npm run dev
```

App available at http://localhost:5173.

## Project Structure

```
wi-vote/
├── packages/
│   ├── client/          # React frontend (Vite + TypeScript)
│   └── server/          # Python FastAPI backend
├── data/
│   ├── raw/             # Downloaded shapefiles, CSVs
│   ├── processed/       # Cleaned, normalized data
│   └── scripts/         # ETL scripts
└── docs/                # Additional documentation
```

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, MapLibre GL JS, deck.gl, Recharts, TanStack Query, Zustand, Tailwind CSS, shadcn/ui
- **Backend:** FastAPI, PostgreSQL 16 + PostGIS 3.4, SQLAlchemy 2.0, Pydantic v2
- **Infrastructure:** Docker Compose, PMTiles, Tippecanoe
