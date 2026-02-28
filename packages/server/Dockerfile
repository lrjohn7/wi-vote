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
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (layer caching)
# Create minimal package structure so setuptools can resolve the project
COPY pyproject.toml ./
RUN mkdir -p app && touch app/__init__.py \
    && pip install --no-cache-dir ".[migration]" \
    && rm -rf app

# Copy application code
COPY . .

# Fix line endings on entrypoint (safety net for Windows checkouts)
RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
