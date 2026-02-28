#!/bin/bash
# Seed Railway PostgreSQL from the wivote_seed.dump file.
#
# Prerequisites:
#   - Install Railway CLI: npm i -g @railway/cli
#   - Login: railway login
#   - Link project: railway link
#   - Have PostgreSQL plugin running in your Railway project
#
# Usage:
#   ./scripts/seed-railway.sh [path-to-dump]
#
# The script connects to your Railway PostgreSQL and restores the dump.

set -e

DUMP_FILE="${1:-wivote_seed.dump}"

if [ ! -f "$DUMP_FILE" ]; then
    echo "Error: Dump file not found: $DUMP_FILE"
    echo "Usage: $0 [path-to-dump-file]"
    exit 1
fi

echo "=== WI-Vote Railway Database Seeding ==="
echo "Dump file: $DUMP_FILE"
echo ""

# Get the DATABASE_URL from Railway
echo "Fetching DATABASE_URL from Railway..."
DB_URL=$(railway variables get DATABASE_URL 2>/dev/null) || {
    echo "Error: Could not get DATABASE_URL from Railway."
    echo "Make sure you have:"
    echo "  1. Railway CLI installed (npm i -g @railway/cli)"
    echo "  2. Logged in (railway login)"
    echo "  3. Linked to your project (railway link)"
    echo "  4. A PostgreSQL plugin added to your project"
    exit 1
}

echo "Connected to Railway PostgreSQL."
echo ""
echo "Restoring database (this may take a few minutes)..."
pg_restore \
    --dbname="$DB_URL" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    --verbose \
    "$DUMP_FILE" 2>&1 | tail -20

echo ""
echo "=== Seeding complete ==="
echo ""
echo "Verify by checking row counts:"
psql "$DB_URL" -c "SELECT 'wards' as tbl, count(*) FROM wards UNION ALL SELECT 'election_results', count(*) FROM election_results UNION ALL SELECT 'ward_demographics', count(*) FROM ward_demographics UNION ALL SELECT 'ward_trends', count(*) FROM ward_trends ORDER BY tbl;"
