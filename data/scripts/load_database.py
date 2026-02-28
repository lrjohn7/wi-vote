"""Load processed ward and election data into PostGIS database.

Usage:
    python data/scripts/load_database.py

Reads data from data/processed/ and bulk inserts into PostgreSQL+PostGIS.
Uses sync psycopg2 driver (not asyncpg) for bulk operations.
"""

import csv
import json
import os
import sys
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values
from shapely.geometry import shape, mapping
from shapely import wkb

PROCESSED_DIR = Path(__file__).resolve().parent.parent / "processed"

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/wivote",
)

# Strip asyncpg driver if present
DATABASE_URL = DATABASE_URL.replace("+asyncpg", "").replace("+psycopg2", "")


def get_connection():
    return psycopg2.connect(DATABASE_URL)


def load_wards(conn, vintage: int) -> int:
    """Load ward boundaries from processed GeoJSON."""
    filepath = PROCESSED_DIR / f"wards_{vintage}.geojson"
    if not filepath.exists():
        print(f"  SKIP: {filepath} not found")
        return 0

    print(f"  Loading {filepath.name}...")
    with open(filepath) as f:
        geojson = json.load(f)

    features = geojson["features"]
    print(f"  Parsed {len(features)} features")

    cur = conn.cursor()

    # Prepare rows for bulk insert
    rows = []
    for feat in features:
        props = feat["properties"]
        geom = feat["geometry"]

        # Ensure MultiPolygon
        if geom["type"] == "Polygon":
            geom = {"type": "MultiPolygon", "coordinates": [geom["coordinates"]]}

        geom_wkt = shape(geom).wkt

        rows.append((
            props.get("ward_id", ""),
            props.get("ward_name", "Unknown"),
            props.get("municipality", "Unknown"),
            props.get("municipality_type"),
            props.get("county", "Unknown"),
            props.get("congressional_district"),
            props.get("state_senate_district"),
            props.get("assembly_district"),
            None,  # county_supervisory_district
            vintage,
            f"SRID=4326;{geom_wkt}",
            props.get("area_sq_miles"),
            bool(props.get("is_estimated", False)),
        ))

    # Delete existing wards for this vintage
    cur.execute("DELETE FROM election_results WHERE ward_vintage = %s", (vintage,))
    cur.execute("DELETE FROM wards WHERE ward_vintage = %s", (vintage,))
    conn.commit()

    # Bulk insert
    sql = """
        INSERT INTO wards (
            ward_id, ward_name, municipality, municipality_type, county,
            congressional_district, state_senate_district, assembly_district,
            county_supervisory_district, ward_vintage, geom, area_sq_miles,
            is_estimated, created_at, updated_at
        ) VALUES %s
        ON CONFLICT ON CONSTRAINT uq_ward_id_vintage DO UPDATE SET
            ward_name = EXCLUDED.ward_name,
            municipality = EXCLUDED.municipality,
            municipality_type = EXCLUDED.municipality_type,
            county = EXCLUDED.county,
            congressional_district = EXCLUDED.congressional_district,
            state_senate_district = EXCLUDED.state_senate_district,
            assembly_district = EXCLUDED.assembly_district,
            geom = EXCLUDED.geom,
            area_sq_miles = EXCLUDED.area_sq_miles,
            is_estimated = EXCLUDED.is_estimated,
            updated_at = NOW()
    """

    template = """(
        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
        ST_GeomFromEWKT(%s), %s, %s, NOW(), NOW()
    )"""

    execute_values(cur, sql, rows, template=template, page_size=500)
    conn.commit()
    cur.close()

    print(f"  Inserted {len(rows)} wards (vintage {vintage})")
    return len(rows)


def load_election_results(conn) -> int:
    """Load election results from processed CSV."""
    filepath = PROCESSED_DIR / "election_results.csv"
    if not filepath.exists():
        print(f"  SKIP: {filepath} not found")
        return 0

    print(f"  Loading {filepath.name}...")

    with open(filepath, newline="") as f:
        reader = csv.DictReader(f)
        rows_list = list(reader)

    print(f"  Parsed {len(rows_list)} rows")

    cur = conn.cursor()

    # Prepare rows for bulk insert
    rows = []
    for r in rows_list:
        rows.append((
            r["ward_id"],
            int(r["election_year"]),
            r["race_type"],
            int(r.get("dem_votes", 0)),
            int(r.get("rep_votes", 0)),
            int(r.get("other_votes", 0)),
            int(r.get("total_votes", 0)),
            r.get("is_estimate", "False").lower() in ("true", "1", "yes"),
            r.get("data_source", "ltsb"),
            int(r.get("ward_vintage", 2020)),
        ))

    sql = """
        INSERT INTO election_results (
            ward_id, election_year, race_type,
            dem_votes, rep_votes, other_votes, total_votes,
            is_estimate, data_source, ward_vintage, created_at
        ) VALUES %s
        ON CONFLICT ON CONSTRAINT idx_results_unique DO UPDATE SET
            dem_votes = EXCLUDED.dem_votes,
            rep_votes = EXCLUDED.rep_votes,
            other_votes = EXCLUDED.other_votes,
            total_votes = EXCLUDED.total_votes,
            is_estimate = EXCLUDED.is_estimate,
            data_source = EXCLUDED.data_source
    """

    # Insert in batches to avoid memory issues
    batch_size = 5000
    total_inserted = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        er_template = "(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())"
        try:
            execute_values(cur, sql, batch, template=er_template, page_size=1000)
            conn.commit()
            total_inserted += len(batch)
            print(f"    Inserted {total_inserted}/{len(rows)} rows...")
        except Exception as e:
            conn.rollback()
            print(f"    ERROR at batch {i}: {e}")
            # Try inserting one at a time to find the bad row
            for j, row in enumerate(batch):
                try:
                    cur.execute(
                        """INSERT INTO election_results
                           (ward_id, election_year, race_type,
                            dem_votes, rep_votes, other_votes, total_votes,
                            is_estimate, data_source, ward_vintage, created_at)
                           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                           ON CONFLICT ON CONSTRAINT idx_results_unique DO NOTHING""",
                        row,
                    )
                    conn.commit()
                    total_inserted += 1
                except Exception as e2:
                    conn.rollback()
                    print(f"    Skipped row {i + j}: {e2} — ward_id={row[0]}")

    cur.close()
    print(f"  Loaded {total_inserted} election results")
    return total_inserted


def verify_data(conn) -> None:
    """Run verification queries."""
    cur = conn.cursor()

    print("\nVerification:")

    cur.execute("SELECT COUNT(*) FROM wards")
    print(f"  Total wards: {cur.fetchone()[0]}")

    cur.execute("SELECT ward_vintage, COUNT(*) FROM wards GROUP BY ward_vintage ORDER BY ward_vintage")
    for row in cur.fetchall():
        print(f"    Vintage {row[0]}: {row[1]} wards")

    cur.execute("SELECT COUNT(*) FROM election_results")
    print(f"  Total election results: {cur.fetchone()[0]}")

    cur.execute("""
        SELECT election_year, race_type, COUNT(*), SUM(dem_votes), SUM(rep_votes)
        FROM election_results
        WHERE race_type = 'president'
        GROUP BY election_year, race_type
        ORDER BY election_year
    """)
    print("\n  Presidential race totals:")
    for row in cur.fetchall():
        print(f"    {row[0]}: {row[2]} wards, DEM={row[3]:,}, REP={row[4]:,}")

    cur.execute("""
        SELECT DISTINCT election_year, race_type
        FROM election_results
        ORDER BY election_year, race_type
    """)
    print("\n  Available elections:")
    for row in cur.fetchall():
        print(f"    {row[0]} {row[1]}")

    cur.close()


def main() -> None:
    print("Database Loading")
    print("=" * 60)

    conn = get_connection()

    # Load wards by vintage
    total_wards = 0
    for vintage in [2020, 2022, 2025]:
        print(f"\n[Wards — vintage {vintage}]")
        total_wards += load_wards(conn, vintage)

    # Load election results
    print("\n[Election Results]")
    total_results = load_election_results(conn)

    # Verify
    verify_data(conn)

    conn.close()

    print(f"\nDone. Loaded {total_wards} wards, {total_results} election results.")


if __name__ == "__main__":
    main()
