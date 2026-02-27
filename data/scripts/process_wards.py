"""Process downloaded LTSB ward data into normalized format.

Usage:
    python data/scripts/process_wards.py

Reads GeoJSON files from data/raw/ and produces cleaned data in data/processed/.
"""

from pathlib import Path

import geopandas as gpd

RAW_DIR = Path(__file__).resolve().parent.parent / "raw"
PROCESSED_DIR = Path(__file__).resolve().parent.parent / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)


def process_ward_boundaries() -> None:
    """Load ward GeoJSON, normalize fields, and save to processed."""
    # TODO: implement when raw data is available
    # Steps:
    # 1. Load GeoJSON with geopandas
    # 2. Normalize column names to match database schema
    # 3. Generate canonical ward_id: {COUNTY_FIPS}-{MUNICIPALITY}-{WARD_NUM}
    # 4. Extract district assignments from LTSB fields
    # 5. Flag wards from disaggregated reporting units
    # 6. Compute area_sq_miles from geometry
    # 7. Save as GeoJSON and CSV (without geometry)
    print("Ward boundary processing not yet implemented.")
    print("Awaiting raw data download from LTSB.")


def process_election_results() -> None:
    """Extract election results from ward features into flat table."""
    # TODO: implement when raw data is available
    # Steps:
    # 1. Load ward GeoJSON
    # 2. Pivot election columns into rows (one row per ward per election)
    # 3. Parse candidate names from column headers
    # 4. Compute dem_pct, rep_pct, margin
    # 5. Mark is_estimate for disaggregated wards
    # 6. Save as CSV
    print("Election result processing not yet implemented.")
    print("Awaiting raw data download from LTSB.")


def validate_totals() -> None:
    """Verify ward totals sum to county totals, county to state."""
    # TODO: cross-reference with WEC certified results
    print("Validation not yet implemented.")


def main() -> None:
    print("Ward Data Processing Pipeline")
    print("=" * 40)
    process_ward_boundaries()
    process_election_results()
    validate_totals()
    print("Done.")


if __name__ == "__main__":
    main()
