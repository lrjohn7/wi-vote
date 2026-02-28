FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for GeoPandas, GDAL, PostGIS client
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    libgdal-dev \
    libgeos-dev \
    libproj-dev \
    libopenblas-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (layer caching)
# Default installs base + migration deps; celery-worker overrides with ".[all,migration]"
ARG INSTALL_EXTRAS=".[migration]"
COPY pyproject.toml ./
RUN mkdir -p app && touch app/__init__.py \
    && pip install --no-cache-dir "${INSTALL_EXTRAS}" \
    && rm -rf app

# Copy application code
COPY . .

# Fix line endings on entrypoint (safety net for Windows checkouts)
RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
