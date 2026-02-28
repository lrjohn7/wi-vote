"""Batch script to pre-fit MRP models for available elections.

Usage:
    python data/scripts/fit_mrp_models.py [--year YEAR] [--race RACE_TYPE]
    python data/scripts/fit_mrp_models.py --year 2024 --race president
    python data/scripts/fit_mrp_models.py  # fits all available elections

Uses sync psycopg2 to query data, then calls PyMC fitting.
"""

import argparse
import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import psycopg2

# Add server package to path for imports
server_dir = Path(__file__).resolve().parent.parent.parent / "packages" / "server"
sys.path.insert(0, str(server_dir))

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/wivote",
)
DATABASE_URL = DATABASE_URL.replace("+asyncpg", "").replace("+psycopg2", "")

# Region mapping: county -> region (same as client-side regionMapping.ts)
MILWAUKEE_METRO = {
    "Milwaukee", "Waukesha", "Ozaukee", "Washington", "Racine", "Kenosha",
}
MADISON_METRO = {"Dane", "Columbia", "Iowa", "Green", "Sauk", "Rock"}
FOX_VALLEY = {
    "Outagamie", "Winnebago", "Calumet", "Brown", "Manitowoc",
    "Sheboygan", "Fond du Lac", "Appleton",
}


def county_to_region(county: str) -> str:
    """Map county name to region."""
    c = county.strip()
    if c in MILWAUKEE_METRO:
        return "milwaukee_metro"
    if c in MADISON_METRO:
        return "madison_metro"
    if c in FOX_VALLEY:
        return "fox_valley"
    return "rural"


def load_ward_data(
    conn, year: int, race_type: str, ward_vintage: int | None = None
) -> pd.DataFrame | None:
    """Load joined election + demographics data for a given election."""
    # Determine ward vintage from year
    if ward_vintage is None:
        ward_vintage = 2022 if year >= 2022 else 2020

    query = """
        SELECT
            er.ward_id,
            w.county,
            w.municipality,
            er.dem_votes,
            er.rep_votes,
            er.total_votes,
            er.is_estimate,
            COALESCE(wd.population_density, 0) AS population_density,
            COALESCE(wd.college_degree_pct, 0) AS college_degree_pct,
            COALESCE(wd.median_household_income, 0) AS median_household_income,
            COALESCE(wd.white_pct, 0) AS white_pct
        FROM election_results er
        JOIN wards w
            ON er.ward_id = w.ward_id AND er.ward_vintage = w.ward_vintage
        LEFT JOIN ward_demographics wd
            ON er.ward_id = wd.ward_id AND wd.ward_vintage = w.ward_vintage
        WHERE er.election_year = %s
            AND er.race_type = %s
            AND er.ward_vintage = %s
            AND er.total_votes > 0
    """
    df = pd.read_sql(query, conn, params=(year, race_type, ward_vintage))

    if df.empty:
        print(f"  No data found for {race_type} {year} (vintage {ward_vintage})")
        return None

    # Add region column
    df["region"] = df["county"].apply(county_to_region)

    print(f"  Loaded {len(df)} wards for {race_type} {year}")
    return df


def get_available_elections(conn) -> list[tuple[int, str]]:
    """Get distinct (year, race_type) pairs from election_results."""
    cur = conn.cursor()
    cur.execute("""
        SELECT DISTINCT election_year, race_type
        FROM election_results
        WHERE total_votes > 0
        ORDER BY election_year DESC, race_type
    """)
    return [(row[0], row[1]) for row in cur.fetchall()]


def fit_one(conn, year: int, race_type: str) -> bool:
    """Fit a single MRP model for the given election."""
    from app.election_models.mrp_model import fit_mrp_model, get_diagnostics
    from app.election_models.mrp_storage import save_trace

    ward_vintage = 2022 if year >= 2022 else 2020
    df = load_ward_data(conn, year, race_type, ward_vintage)
    if df is None or len(df) < 100:
        print(f"  SKIP: insufficient data for {race_type} {year}")
        return False

    print(f"  Fitting MRP model for {race_type} {year} ({len(df)} wards)...")

    try:
        trace = fit_mrp_model(df, draws=2000, tune=1000, chains=2)
    except Exception as e:
        print(f"  FAILED: {e}")
        return False

    # Get diagnostics
    diag = get_diagnostics(trace)
    print(f"  Diagnostics: R-hat max={diag['r_hat_max']}, ESS min={diag['ess_min']}")

    # Save
    save_trace(trace, race_type, year, ward_vintage, metadata=diag)
    print(f"  Saved trace for {race_type} {year}")

    return True


def main():
    parser = argparse.ArgumentParser(description="Fit MRP election models")
    parser.add_argument("--year", type=int, help="Election year (fits all if omitted)")
    parser.add_argument("--race", type=str, help="Race type (fits all if omitted)")
    parser.add_argument(
        "--races",
        type=str,
        default="president,governor,us_senate",
        help="Comma-separated race types to fit (default: president,governor,us_senate)",
    )
    args = parser.parse_args()

    conn = psycopg2.connect(DATABASE_URL)

    if args.year and args.race:
        # Fit a single election
        success = fit_one(conn, args.year, args.race)
        conn.close()
        sys.exit(0 if success else 1)

    # Fit multiple elections
    available = get_available_elections(conn)
    target_races = set(args.races.split(","))

    fitted = 0
    failed = 0
    for year, race_type in available:
        if args.year and year != args.year:
            continue
        if args.race and race_type != args.race:
            continue
        if race_type not in target_races:
            continue

        print(f"\n{'='*60}")
        print(f"Fitting {race_type} {year}")
        print(f"{'='*60}")

        if fit_one(conn, year, race_type):
            fitted += 1
        else:
            failed += 1

    conn.close()
    print(f"\nDone: {fitted} fitted, {failed} failed")


if __name__ == "__main__":
    main()
