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

# Entrypoint runs migrations then starts the app
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
