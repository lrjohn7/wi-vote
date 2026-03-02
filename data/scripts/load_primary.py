"""Load processed primary election data into PostGIS database.

Usage:
    python data/scripts/load_primary.py
    python data/scripts/load_primary.py --database-url postgresql://user:pass@host/db

Reads data from:
  - data/processed/primary_results.csv       (candidate-level results)
  - data/processed/primary_wards.geojson     (reporting unit geometries)
  - data/processed/reporting_unit_mapping.csv (RU -> ward ID mapping)

Bulk inserts into primary_reporting_units and primary_results tables.
Uses sync psycopg2 driver (not asyncpg) for bulk operations.
"""

import argparse
import csv
import json
import os
import sys
from datetime import date
from pathlib import Path
from typing import Any

import psycopg2
from psycopg2.extras import execute_values
from shapely.geometry import shape

PROCESSED_DIR = Path(__file__).resolve().parent.parent / "processed"

DEFAULT_DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/wivote",
)

# Primary election dates by year
PRIMARY_DATES: dict[int, date] = {
    2002: date(2002, 9, 10),
    2006: date(2006, 9, 12),
    2010: date(2010, 9, 14),
    2014: date(2014, 8, 12),
    2018: date(2018, 8, 14),
}

# SQL to create tables (idempotent -- uses IF NOT EXISTS)
CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS primary_reporting_units (
    id SERIAL PRIMARY KEY,
    ru_id VARCHAR(100) UNIQUE NOT NULL,
    ru_name VARCHAR(500) NOT NULL,
    county VARCHAR(100) NOT NULL,
    constituent_ward_ids TEXT[],
    n_constituent_wards INTEGER DEFAULT 1,
    ward_vintage INTEGER NOT NULL DEFAULT 2020,
    geom GEOMETRY(MultiPolygon, 4326),
    area_sq_miles FLOAT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_primary_ru_geom
    ON primary_reporting_units USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_primary_ru_county
    ON primary_reporting_units(county);
CREATE INDEX IF NOT EXISTS idx_primary_ru_vintage
    ON primary_reporting_units(ward_vintage);

CREATE TABLE IF NOT EXISTS primary_results (
    id SERIAL PRIMARY KEY,
    ru_id VARCHAR(100) NOT NULL REFERENCES primary_reporting_units(ru_id),
    election_year INTEGER NOT NULL,
    election_date DATE,
    race_type VARCHAR(50) NOT NULL DEFAULT 'governor',
    party VARCHAR(10) NOT NULL DEFAULT 'DEM',
    candidate VARCHAR(255) NOT NULL,
    votes INTEGER NOT NULL DEFAULT 0,
    total_votes INTEGER NOT NULL DEFAULT 0,
    vote_pct FLOAT,
    data_source VARCHAR(100) DEFAULT 'openelections',
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_primary_result UNIQUE (ru_id, election_year, race_type, candidate)
);

CREATE INDEX IF NOT EXISTS idx_primary_results_year
    ON primary_results(election_year, race_type);
CREATE INDEX IF NOT EXISTS idx_primary_results_ru
    ON primary_results(ru_id);
"""


def get_connection(database_url: str) -> psycopg2.extensions.connection:
    """Create a sync psycopg2 connection, stripping async driver prefixes."""
    url = database_url.replace("+asyncpg", "").replace("+psycopg2", "")
    return psycopg2.connect(url)


def create_tables(conn: psycopg2.extensions.connection) -> None:
    """Create primary election tables if they do not exist."""
    cur = conn.cursor()
    cur.execute(CREATE_TABLES_SQL)
    conn.commit()
    cur.close()
    print("  Tables created (or already exist)")


def load_reporting_unit_mapping(
    filepath: Path,
) -> dict[str, dict[str, Any]]:
    """Read reporting_unit_mapping.csv into a dict keyed by ru_id.

    Returns:
        {ru_id: {ru_name, county, matched_ward_ids, n_wards_matched, match_quality}}
    """
    if not filepath.exists():
        print(f"  WARNING: {filepath} not found -- skipping mapping")
        return {}

    mapping: dict[str, dict[str, Any]] = {}
    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            ru_id = row["ru_id"]
            ward_ids_raw = row.get("matched_ward_ids", "")
            ward_ids = (
                [w.strip() for w in ward_ids_raw.split(";") if w.strip()]
                if ward_ids_raw
                else []
            )
            mapping[ru_id] = {
                "ru_name": row.get("ru_name", ""),
                "county": row.get("county", ""),
                "matched_ward_ids": ward_ids,
                "n_wards_matched": int(row.get("n_wards_matched", len(ward_ids))),
                "match_quality": row.get("match_quality", "unknown"),
            }
    print(f"  Loaded {len(mapping)} reporting unit mappings")
    return mapping


def load_reporting_units(
    conn: psycopg2.extensions.connection,
    geojson_path: Path,
    mapping: dict[str, dict[str, Any]],
) -> int:
    """Load reporting unit geometries from GeoJSON and mapping CSV.

    Inserts matched RUs (with geometry from GeoJSON) and unmatched RUs
    (with NULL geometry from mapping CSV).
    """
    cur = conn.cursor()

    # Track which ru_ids we insert from GeoJSON
    inserted_ru_ids: set[str] = set()
    rows_with_geom: list[tuple[Any, ...]] = []

    # 1. Load from GeoJSON (RUs with geometry)
    if geojson_path.exists():
        print(f"  Loading geometries from {geojson_path.name}...")
        with open(geojson_path, encoding="utf-8") as f:
            geojson = json.load(f)

        features = geojson.get("features", [])
        print(f"  Parsed {len(features)} features from GeoJSON")

        for feat in features:
            props = feat.get("properties", {})
            geom = feat.get("geometry")
            if geom is None:
                continue

            ru_id = str(props.get("ru_id", ""))
            if not ru_id:
                continue

            # Ensure MultiPolygon
            if geom["type"] == "Polygon":
                geom = {
                    "type": "MultiPolygon",
                    "coordinates": [geom["coordinates"]],
                }

            geom_wkt = shape(geom).wkt
            county = props.get("county", "")
            ru_name = props.get("ru_name", props.get("reporting_unit", ""))

            # Prefer mapping data for ward IDs if available
            map_info = mapping.get(ru_id, {})
            ward_ids = map_info.get("matched_ward_ids", [])
            n_wards = map_info.get("n_wards_matched", len(ward_ids)) if ward_ids else 1
            if not county and map_info.get("county"):
                county = map_info["county"]
            if not ru_name and map_info.get("ru_name"):
                ru_name = map_info["ru_name"]

            rows_with_geom.append((
                ru_id,
                ru_name or "Unknown",
                county or "Unknown",
                ward_ids if ward_ids else None,
                n_wards,
                2020,  # ward_vintage
                f"SRID=4326;{geom_wkt}",
                props.get("area_sq_miles"),
            ))
            inserted_ru_ids.add(ru_id)
    else:
        print(f"  WARNING: {geojson_path} not found -- no geometries to load")

    # 2. Collect unmatched RUs from mapping (no geometry)
    rows_no_geom: list[tuple[Any, ...]] = []
    for ru_id, info in mapping.items():
        if ru_id in inserted_ru_ids:
            continue
        # Include unmatched and any other RUs not in GeoJSON
        rows_no_geom.append((
            ru_id,
            info.get("ru_name", "Unknown"),
            info.get("county", "Unknown"),
            info.get("matched_ward_ids") or None,
            info.get("n_wards_matched", 0),
            2020,
            None,  # no geometry
            None,  # no area
        ))

    # 3. Delete existing data (reload is idempotent)
    cur.execute("DELETE FROM primary_results")
    cur.execute("DELETE FROM primary_reporting_units")
    conn.commit()
    print("  Cleared existing primary data")

    # 4. Insert RUs with geometry
    if rows_with_geom:
        sql_geom = """
            INSERT INTO primary_reporting_units (
                ru_id, ru_name, county, constituent_ward_ids,
                n_constituent_wards, ward_vintage, geom, area_sq_miles,
                created_at
            ) VALUES %s
            ON CONFLICT (ru_id) DO UPDATE SET
                ru_name = EXCLUDED.ru_name,
                county = EXCLUDED.county,
                constituent_ward_ids = EXCLUDED.constituent_ward_ids,
                n_constituent_wards = EXCLUDED.n_constituent_wards,
                geom = EXCLUDED.geom,
                area_sq_miles = EXCLUDED.area_sq_miles
        """
        template_geom = (
            "(%s, %s, %s, %s, %s, %s, ST_GeomFromEWKT(%s), %s, NOW())"
        )
        execute_values(
            cur, sql_geom, rows_with_geom,
            template=template_geom, page_size=500,
        )
        conn.commit()
        print(f"  Inserted {len(rows_with_geom)} reporting units (with geometry)")

    # 5. Insert RUs without geometry
    if rows_no_geom:
        sql_no_geom = """
            INSERT INTO primary_reporting_units (
                ru_id, ru_name, county, constituent_ward_ids,
                n_constituent_wards, ward_vintage, geom, area_sq_miles,
                created_at
            ) VALUES %s
            ON CONFLICT (ru_id) DO UPDATE SET
                ru_name = EXCLUDED.ru_name,
                county = EXCLUDED.county,
                constituent_ward_ids = EXCLUDED.constituent_ward_ids,
                n_constituent_wards = EXCLUDED.n_constituent_wards
        """
        template_no_geom = "(%s, %s, %s, %s, %s, %s, NULL, %s, NOW())"
        execute_values(
            cur, sql_no_geom, rows_no_geom,
            template=template_no_geom, page_size=500,
        )
        conn.commit()
        print(f"  Inserted {len(rows_no_geom)} reporting units (no geometry)")

    cur.close()
    total = len(rows_with_geom) + len(rows_no_geom)
    return total


def load_results(conn: psycopg2.extensions.connection) -> int:
    """Load primary election results from processed CSV.

    Reads data/processed/primary_results.csv and bulk inserts into
    the primary_results table.
    """
    filepath = PROCESSED_DIR / "primary_results.csv"
    if not filepath.exists():
        print(f"  SKIP: {filepath} not found")
        return 0

    print(f"  Loading {filepath.name}...")
    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        csv_rows = list(reader)

    print(f"  Parsed {len(csv_rows)} rows from CSV")

    # Get the set of valid ru_ids from the database
    cur = conn.cursor()
    cur.execute("SELECT ru_id FROM primary_reporting_units")
    valid_ru_ids: set[str] = {row[0] for row in cur.fetchall()}
    print(f"  Found {len(valid_ru_ids)} valid reporting units in database")

    # Prepare rows, skipping those with no matching RU
    rows: list[tuple[Any, ...]] = []
    skipped = 0
    for r in csv_rows:
        ru_id = r.get("ru_id", "")
        if not ru_id or ru_id not in valid_ru_ids:
            skipped += 1
            continue

        year = int(r.get("election_year", 0))
        election_date = PRIMARY_DATES.get(year)
        votes = int(r.get("votes", 0))
        total_votes = int(r.get("total_votes", 0))
        vote_pct_raw = r.get("vote_pct", "")
        vote_pct = float(vote_pct_raw) if vote_pct_raw else (
            (votes / total_votes * 100) if total_votes > 0 else 0.0
        )

        rows.append((
            ru_id,
            year,
            election_date,
            r.get("race_type", "governor"),
            r.get("party", "DEM"),
            r.get("candidate", "Unknown"),
            votes,
            total_votes,
            vote_pct,
            r.get("data_source", "openelections"),
        ))

    if skipped > 0:
        print(f"  Skipped {skipped} rows (no matching reporting unit)")

    if not rows:
        print("  No valid rows to insert")
        cur.close()
        return 0

    # Bulk insert in batches
    sql = """
        INSERT INTO primary_results (
            ru_id, election_year, election_date, race_type, party,
            candidate, votes, total_votes, vote_pct, data_source,
            created_at
        ) VALUES %s
        ON CONFLICT ON CONSTRAINT uq_primary_result DO UPDATE SET
            votes = EXCLUDED.votes,
            total_votes = EXCLUDED.total_votes,
            vote_pct = EXCLUDED.vote_pct,
            data_source = EXCLUDED.data_source
    """
    template = "(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())"

    batch_size = 5000
    total_inserted = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        try:
            execute_values(
                cur, sql, batch,
                template=template, page_size=1000,
            )
            conn.commit()
            total_inserted += len(batch)
            print(f"    Inserted {total_inserted}/{len(rows)} rows...")
        except Exception as e:
            conn.rollback()
            print(f"    ERROR at batch starting at index {i}: {e}")
            # Fall back to row-by-row insertion to identify bad rows
            for j, row in enumerate(batch):
                try:
                    cur.execute(
                        """INSERT INTO primary_results
                           (ru_id, election_year, election_date, race_type,
                            party, candidate, votes, total_votes, vote_pct,
                            data_source, created_at)
                           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                           ON CONFLICT ON CONSTRAINT uq_primary_result
                           DO NOTHING""",
                        row,
                    )
                    conn.commit()
                    total_inserted += 1
                except Exception as e2:
                    conn.rollback()
                    print(
                        f"    Skipped row {i + j}: {e2} "
                        f"-- ru_id={row[0]}, candidate={row[5]}"
                    )

    cur.close()
    print(f"  Loaded {total_inserted} primary results")
    return total_inserted


def verify_data(conn: psycopg2.extensions.connection) -> None:
    """Run verification queries and print a summary."""
    cur = conn.cursor()

    print("\nVerification:")

    cur.execute("SELECT COUNT(*) FROM primary_reporting_units")
    total_rus = cur.fetchone()[0]
    print(f"  Total reporting units: {total_rus}")

    cur.execute(
        "SELECT COUNT(*) FROM primary_reporting_units WHERE geom IS NOT NULL"
    )
    with_geom = cur.fetchone()[0]
    print(f"    With geometry: {with_geom}")
    print(f"    Without geometry: {total_rus - with_geom}")

    cur.execute(
        """SELECT county, COUNT(*)
           FROM primary_reporting_units
           GROUP BY county
           ORDER BY COUNT(*) DESC
           LIMIT 10"""
    )
    print("\n  Top 10 counties by reporting unit count:")
    for row in cur.fetchall():
        print(f"    {row[0]}: {row[1]}")

    cur.execute("SELECT COUNT(*) FROM primary_results")
    print(f"\n  Total primary results: {cur.fetchone()[0]}")

    cur.execute(
        """SELECT election_year, COUNT(DISTINCT ru_id), COUNT(DISTINCT candidate),
                  SUM(votes)
           FROM primary_results
           GROUP BY election_year
           ORDER BY election_year"""
    )
    print("\n  Results by year:")
    print(f"    {'Year':<8} {'RUs':<8} {'Candidates':<12} {'Total Votes':<15}")
    print(f"    {'-' * 43}")
    for row in cur.fetchall():
        print(f"    {row[0]:<8} {row[1]:<8} {row[2]:<12} {row[3]:>14,}")

    cur.execute(
        """SELECT election_year, race_type, party, candidate, SUM(votes) as total
           FROM primary_results
           GROUP BY election_year, race_type, party, candidate
           ORDER BY election_year, race_type, party, total DESC"""
    )
    results = cur.fetchall()
    if results:
        print("\n  Candidate totals:")
        current_year = None
        for row in results:
            if row[0] != current_year:
                current_year = row[0]
                print(f"\n    --- {current_year} ---")
            print(
                f"    [{row[2]:>3}] {row[3]:<30} "
                f"{row[1]:<15} {row[4]:>10,} votes"
            )

    cur.close()


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Load primary election data into PostGIS database."
    )
    parser.add_argument(
        "--database-url",
        default=DEFAULT_DATABASE_URL,
        help=(
            "PostgreSQL connection URL "
            "(default: DATABASE_URL env var or local dev)"
        ),
    )
    parser.add_argument(
        "--skip-verify",
        action="store_true",
        help="Skip verification queries after loading",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    print("Primary Election Data Loading")
    print("=" * 60)

    conn = get_connection(args.database_url)

    try:
        # Create tables
        print("\n[Create Tables]")
        create_tables(conn)

        # Load reporting unit mapping
        print("\n[Reporting Unit Mapping]")
        mapping_path = PROCESSED_DIR / "reporting_unit_mapping.csv"
        mapping = load_reporting_unit_mapping(mapping_path)

        # Load reporting units (with geometry)
        print("\n[Reporting Units]")
        geojson_path = PROCESSED_DIR / "primary_wards.geojson"
        total_rus = load_reporting_units(conn, geojson_path, mapping)

        # Load results
        print("\n[Primary Results]")
        total_results = load_results(conn)

        # Verify
        if not args.skip_verify:
            verify_data(conn)

        print(
            f"\nDone. Loaded {total_rus} reporting units, "
            f"{total_results} primary results."
        )
    except Exception as e:
        conn.rollback()
        print(f"\nFATAL ERROR: {e}")
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
