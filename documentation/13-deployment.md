# 13 — Deployment

> Railway deployment with nginx reverse proxy, Docker multi-stage build, and DNS re-resolution.

---

## Architecture

```
Railway Platform
├── client (nginx) ──► Serves React SPA + reverse-proxies /api/ to API service
├── api (FastAPI)  ──► Python backend with PostGIS queries
├── db (PostgreSQL + PostGIS)
├── redis
├── celery-worker  ──► MRP model fitting
└── seed           ──► Data ingestion on deploy
```

---

## Client Dockerfile

**File:** `packages/client/Dockerfile`

### Stage 1: Build

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
```

### Stage 2: Serve

```dockerfile
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
ENV API_UPSTREAM=http://api:8000
ENV PORT=80
ENV DNS_RESOLVER=[fd12::10]
```

### CMD Pipeline

The CMD uses `envsubst` to inject environment variables into the nginx config template:

1. Falls back to `/etc/resolv.conf` nameserver if `DNS_RESOLVER` not set
2. Substitutes `${API_UPSTREAM}`, `${PORT}`, `${DNS_RESOLVER}` into nginx config
3. Starts nginx in foreground mode

---

## Nginx Configuration

**File:** `packages/client/nginx.conf`

### API Reverse Proxy (Critical: DNS Re-Resolution)

```nginx
resolver ${DNS_RESOLVER} ipv6=on valid=5s;
set $api_upstream ${API_UPSTREAM};
location /api/ {
    proxy_pass $api_upstream;
    ...
}
```

**Problem:** Nginx resolves upstream hostnames once at startup and caches the IP forever. When the API service restarts on Railway, it gets a new internal IP. Nginx keeps routing to the dead IP → 504 timeouts.

**Fix:** Using a variable (`$api_upstream`) forces nginx to re-resolve DNS on each request. The `resolver` directive points to Railway's internal IPv6 DNS (`fd12::10`) with 5-second TTL.

**Key details:**
- Railway uses IPv6 networking internally
- DNS resolver is `fd12::10` (not a standard IPv4 nameserver)
- `ipv6=on` flag is required
- `resolver` must be at `server` level, not inside `location`
- `valid=5s` re-resolves every 5 seconds

### Static Asset Caching

| Path | Cache | Headers |
|------|-------|---------|
| `/tiles/` | 30 days | `public, immutable` |
| `/assets/` | 30 days | `public, immutable` |

### SPA Fallback

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

All non-file, non-API routes serve `index.html` for client-side routing.

---

## Environment Variables

### Client Service

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `80` | Nginx listen port (Railway sets this) |
| `API_UPSTREAM` | `http://api:8000` | Internal API URL |
| `DNS_RESOLVER` | `[fd12::10]` | Railway IPv6 DNS resolver |

### API Service

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `API_CORS_ORIGINS` | Comma-separated allowed origins |
| `CENSUS_GEOCODER_URL` | US Census Geocoder API base URL |
| `REDIS_URL` | Redis connection for Celery |

### Client Build-Time (Vite)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | API base URL (not used in prod — nginx proxies) |
| `VITE_MAPTILER_KEY` | MapTiler API key (free tier) |

---

## Docker Compose

**File:** `docker-compose.yml`

6 services with profiles:

| Service | Profile | Description |
|---------|---------|-------------|
| `db` | (always) | PostgreSQL 16 + PostGIS 3.4 |
| `redis` | (always) | Redis for Celery task queue |
| `api` | (always) | FastAPI backend |
| `celery-worker` | (always) | MRP model fitting worker |
| `seed` | `seed` | Data ingestion (runs once) |
| `tiles` | `tiles` | PMTiles generation (runs once) |

---

## Deployment URL

**Production:** `https://client-production-b36e.up.railway.app`

---

## Files

| File | Purpose |
|------|---------|
| `packages/client/Dockerfile` | Multi-stage build: node → nginx |
| `packages/client/nginx.conf` | Nginx template with DNS re-resolution |
| `docker-compose.yml` | Local dev environment with 6 services |
| `.env.example` | Environment variable template |
