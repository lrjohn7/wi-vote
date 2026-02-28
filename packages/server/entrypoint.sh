#!/bin/bash
set -e

# Wait for PostgreSQL to be fully ready (init scripts complete, accepting queries)
echo "Waiting for database..."
MAX_RETRIES=30
RETRY_INTERVAL=2
for i in $(seq 1 $MAX_RETRIES); do
    if python -c "
import psycopg2, os
url = os.environ.get('DATABASE_URL', '')
url = url.replace('+asyncpg', '').replace('+psycopg2', '')
conn = psycopg2.connect(url)
cur = conn.cursor()
cur.execute('SELECT PostGIS_Version()')
cur.close()
conn.close()
" 2>/dev/null; then
        echo "Database ready (PostGIS confirmed)."
        break
    fi
    if [ "$i" -eq "$MAX_RETRIES" ]; then
        echo "ERROR: Database not ready after $((MAX_RETRIES * RETRY_INTERVAL))s"
        exit 1
    fi
    echo "  Attempt $i/$MAX_RETRIES — retrying in ${RETRY_INTERVAL}s..."
    sleep $RETRY_INTERVAL
done

# Run Alembic migrations
echo "Running database migrations..."
alembic upgrade head

# Start the application
echo "Starting API server..."
exec "$@"
