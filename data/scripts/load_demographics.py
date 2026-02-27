"""Load ward demographics into the ward_demographics table.

Usage:
    python data/scripts/load_demographics.py

Reads data/processed/ward_demographics.csv and bulk inserts into PostgreSQL.
Uses sync psycopg2 driver (same pattern as load_database.py).
"""

import csv
import os
import sys
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values

PROCESSED_DIR = Path(__file__).resolve().parent.parent / "processed"

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/wivote",
)
DATABASE_URL = DATABASE_URL.replace("+asyncpg", "").replace("+psycopg2", "")


def get_connection():
    return psycopg2.connect(DATABASE_URL)


def load_demographics(conn) -> int:
    """Load ward demographics from processed CSV."""
    filepath = PROCESSED_DIR / "ward_demographics.csv"
    if not filepath.exists():
        print(f"  SKIP: {filepath} not found")
        print("  Run process_demographics.py first.")
        return 0

    print(f"  Loading {filepath.name}...")

    with open(filepath, newline="") as f:
        reader = csv.DictReader(f)
        rows_list = list(reader)

    print(f"  Parsed {len(rows_list)} rows")

    cur = conn.cursor()

    # Clear existing demographic data
    cur.execute("DELETE FROM ward_demographics")
    conn.commit()
    print("  Cleared existing demographic data")

    # Prepare rows for bulk insert
    rows = []
    for r in rows_list:
        def safe_int(val):
            if val is None or val == "":
                return None
            return int(float(val))

        def safe_float(val):
            if val is None or val == "":
                return None
            return float(val)

        rows.append((
            r["ward_id"],
            safe_int(r.get("census_year")),
            safe_int(r.get("total_population")),
            safe_int(r.get("voting_age_population")),
            safe_float(r.get("white_pct")),
            safe_float(r.get("black_pct")),
            safe_float(r.get("hispanic_pct")),
            safe_float(r.get("asian_pct")),
            safe_float(r.get("college_degree_pct")),
            safe_int(r.get("median_household_income")),
            r.get("urban_rural_class"),
            safe_float(r.get("population_density")),
            safe_int(r.get("ward_vintage", 2020)),
            r.get("data_source", "census_2020"),
        ))

    sql = """
        INSERT INTO ward_demographics (
            ward_id, census_year, total_population, voting_age_population,
            white_pct, black_pct, hispanic_pct, asian_pct,
            college_degree_pct, median_household_income,
            urban_rural_class, population_density,
            ward_vintage, data_source
        ) VALUES %s
    """

    template = "(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"

    batch_size = 2000
    total_inserted = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        execute_values(cur, sql, batch, template=template, page_size=1000)
        conn.commit()
        total_inserted += len(batch)
        print(f"    Inserted {total_inserted}/{len(rows)} rows...")

    cur.close()
    print(f"  Loaded {total_inserted} ward demographics")
    return total_inserted


def verify_demographics(conn) -> None:
    """Run verification queries."""
    cur = conn.cursor()

    print("\nVerification:")

    cur.execute("SELECT COUNT(*) FROM ward_demographics")
    print(f"  Total rows: {cur.fetchone()[0]}")

    cur.execute("""
        SELECT urban_rural_class, COUNT(*)
        FROM ward_demographics
        GROUP BY urban_rural_class
        ORDER BY urban_rural_class
    """)
    print("  By classification:")
    for row in cur.fetchall():
        print(f"    {row[0]}: {row[1]}")

    cur.execute("""
        SELECT
            AVG(total_population) as avg_pop,
            AVG(college_degree_pct) as avg_college,
            AVG(median_household_income) as avg_income
        FROM ward_demographics
    """)
    row = cur.fetchone()
    print(f"  Avg population: {row[0]:.0f}")
    print(f"  Avg college %: {row[1]:.1f}%")
    print(f"  Avg income: ${row[2]:,.0f}")

    cur.close()


def main() -> None:
    print("Load Demographics")
    print("=" * 60)

    conn = get_connection()

    print("\n[Ward Demographics]")
    total = load_demographics(conn)

    if total > 0:
        verify_demographics(conn)

    conn.close()
    print(f"\nDone. Loaded {total} ward demographics.")


if __name__ == "__main__":
    main()
