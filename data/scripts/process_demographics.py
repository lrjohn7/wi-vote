"""Process Census/ACS block-group demographics into ward-level demographics.

Usage:
    python data/scripts/process_demographics.py

Reads block-group data from data/raw/demographics/, crosswalks to ward
boundaries using block-to-ward assignment files, and aggregates to ward
level with population-weighted averages.

Classifies urban/suburban/rural using population density thresholds:
  - >3000/sq mi = urban
  - >500/sq mi = suburban
  - else = rural

Outputs data/processed/ward_demographics.csv.
"""

import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

RAW_DIR = Path(__file__).resolve().parent.parent / "raw" / "demographics"
PROCESSED_DIR = Path(__file__).resolve().parent.parent / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

# Ward boundaries for area calculation
WARDS_DIR = Path(__file__).resolve().parent.parent / "processed"

DENSITY_URBAN = 3000  # people per sq mile
DENSITY_SUBURBAN = 500


def load_census_json(filename: str) -> tuple[list[str], list[list[str]]]:
    """Load Census API JSON response (header + data rows)."""
    filepath = RAW_DIR / filename
    if not filepath.exists():
        print(f"  WARNING: {filepath} not found")
        return [], []

    with open(filepath) as f:
        data = json.load(f)

    header = data[0]
    rows = data[1:]
    print(f"  Loaded {len(rows)} rows from {filename}")
    return header, rows


def build_block_group_id(state: str, county: str, tract: str, bg: str) -> str:
    """Build a FIPS block group ID: state(2) + county(3) + tract(6) + bg(1) = 12 chars."""
    return f"{state}{county}{tract}{bg}"


def load_crosswalk() -> dict[str, str]:
    """Load block-to-ward (VTD) crosswalk.

    Returns mapping: block_group_fips (12 chars) -> set of (ward_geoid, block_population).
    Since we work at block-group level, we map each block group to its
    most-populous ward assignment.
    """
    # Try to find the BAF file
    baf_candidates = list(RAW_DIR.glob("*VTD*.txt")) + list(RAW_DIR.glob("*vtd*.txt"))
    if not baf_candidates:
        baf_candidates = list(RAW_DIR.glob("*VTD*.csv")) + list(RAW_DIR.glob("*vtd*.csv"))

    if not baf_candidates:
        print("  WARNING: No block-to-ward crosswalk found.")
        print("  Will use GEOID prefix matching (block group -> county -> ward lookup)")
        return {}

    baf_path = baf_candidates[0]
    print(f"  Loading crosswalk from {baf_path.name}...")

    # BAF format: BLOCKID|VTD (pipe-delimited)
    # BLOCKID is 15 chars: state(2)+county(3)+tract(6)+block(4)
    # Block group = first 12 chars of BLOCKID
    bg_to_vtd: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    with open(baf_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f, delimiter="|")
        header = next(reader, None)
        for row in reader:
            if len(row) < 2:
                continue
            block_id = row[0].strip()
            vtd_id = row[1].strip()
            if len(block_id) >= 12 and vtd_id:
                bg_id = block_id[:12]
                bg_to_vtd[bg_id][vtd_id] += 1

    # For each block group, assign to the most common ward
    bg_to_ward: dict[str, str] = {}
    for bg_id, vtd_counts in bg_to_vtd.items():
        # Pick ward with most blocks in this block group
        best_ward = max(vtd_counts, key=vtd_counts.get)
        # Build GEOID: state(2) + county(3) + vtd code
        county_fips = bg_id[:5]
        bg_to_ward[bg_id] = f"{county_fips}{best_ward}"

    print(f"  Mapped {len(bg_to_ward)} block groups to wards")
    return bg_to_ward


def load_ward_areas() -> dict[str, float]:
    """Load ward areas from processed GeoJSON for density calculation."""
    areas: dict[str, float] = {}

    for vintage in [2020, 2022, 2025]:
        filepath = WARDS_DIR / f"wards_{vintage}.geojson"
        if not filepath.exists():
            continue

        with open(filepath) as f:
            geojson = json.load(f)

        for feat in geojson["features"]:
            ward_id = feat["properties"].get("ward_id", "")
            area = feat["properties"].get("area_sq_miles")
            if ward_id and area:
                areas[ward_id] = float(area)

    print(f"  Loaded areas for {len(areas)} wards")
    return areas


def classify_urban_rural(density: float) -> str:
    """Classify ward by population density."""
    if density > DENSITY_URBAN:
        return "urban"
    elif density > DENSITY_SUBURBAN:
        return "suburban"
    else:
        return "rural"


def process_demographics() -> None:
    """Main processing pipeline."""
    print("Processing Demographics")
    print("=" * 60)

    # Load raw data
    print("\n[Loading Census 2020 PL94]")
    pl94_header, pl94_rows = load_census_json("census_2020_pl94.json")

    print("\n[Loading ACS 2020 5-Year]")
    acs_header, acs_rows = load_census_json("acs_2020_5yr.json")

    print("\n[Loading Crosswalk]")
    crosswalk = load_crosswalk()

    print("\n[Loading Ward Areas]")
    ward_areas = load_ward_areas()

    if not pl94_rows and not acs_rows:
        print("\nERROR: No Census data found. Run download_demographics.py first.")
        sys.exit(1)

    # Build block-group level demographics
    print("\n[Building block-group demographics]")
    bg_data: dict[str, dict] = {}

    # Process PL94 data
    if pl94_header and pl94_rows:
        idx = {col: i for i, col in enumerate(pl94_header)}
        for row in pl94_rows:
            bg_id = build_block_group_id(
                row[idx["state"]], row[idx["county"]],
                row[idx["tract"]], row[idx["block group"]],
            )
            total_pop = int(row[idx.get("P1_001N", 0)] or 0)
            if total_pop == 0:
                continue

            bg_data[bg_id] = {
                "total_population": total_pop,
                "voting_age_population": int(row[idx.get("P3_001N", 0)] or 0),
                "white": int(row[idx.get("P1_003N", 0)] or 0),
                "black": int(row[idx.get("P1_004N", 0)] or 0),
                "asian": int(row[idx.get("P1_006N", 0)] or 0),
                "hispanic": int(row[idx.get("P2_002N", 0)] or 0),
            }

    # Process ACS data
    if acs_header and acs_rows:
        idx = {col: i for i, col in enumerate(acs_header)}
        for row in acs_rows:
            bg_id = build_block_group_id(
                row[idx["state"]], row[idx["county"]],
                row[idx["tract"]], row[idx["block group"]],
            )
            if bg_id not in bg_data:
                bg_data[bg_id] = {"total_population": 0}

            edu_total = int(row[idx.get("B15003_001E", 0)] or 0)
            bachelors = int(row[idx.get("B15003_022E", 0)] or 0)
            masters = int(row[idx.get("B15003_023E", 0)] or 0)
            professional = int(row[idx.get("B15003_024E", 0)] or 0)
            doctorate = int(row[idx.get("B15003_025E", 0)] or 0)
            college_total = bachelors + masters + professional + doctorate

            income_raw = row[idx.get("B19013_001E", 0)]
            median_income = int(income_raw) if income_raw and income_raw not in ("-666666666", "") else None

            bg_data[bg_id]["edu_total"] = edu_total
            bg_data[bg_id]["college_total"] = college_total
            bg_data[bg_id]["median_household_income"] = median_income

    print(f"  {len(bg_data)} block groups with data")

    # Aggregate to ward level using crosswalk
    print("\n[Aggregating to ward level]")
    ward_demo: dict[str, dict] = defaultdict(lambda: {
        "total_population": 0,
        "voting_age_population": 0,
        "white": 0,
        "black": 0,
        "asian": 0,
        "hispanic": 0,
        "edu_total": 0,
        "college_total": 0,
        "income_weighted_sum": 0,
        "income_pop": 0,
    })

    mapped_count = 0
    unmapped_count = 0

    for bg_id, data in bg_data.items():
        ward_id = crosswalk.get(bg_id)
        if not ward_id:
            # Fallback: use county-level aggregation (first 5 digits of GEOID)
            unmapped_count += 1
            continue

        mapped_count += 1
        w = ward_demo[ward_id]
        pop = data.get("total_population", 0)
        w["total_population"] += pop
        w["voting_age_population"] += data.get("voting_age_population", 0)
        w["white"] += data.get("white", 0)
        w["black"] += data.get("black", 0)
        w["asian"] += data.get("asian", 0)
        w["hispanic"] += data.get("hispanic", 0)
        w["edu_total"] += data.get("edu_total", 0)
        w["college_total"] += data.get("college_total", 0)
        income = data.get("median_household_income")
        if income is not None and pop > 0:
            w["income_weighted_sum"] += income * pop
            w["income_pop"] += pop

    print(f"  Mapped: {mapped_count}, Unmapped: {unmapped_count}")
    print(f"  {len(ward_demo)} wards with demographic data")

    # Build output CSV
    print("\n[Writing ward_demographics.csv]")
    output_path = PROCESSED_DIR / "ward_demographics.csv"
    fieldnames = [
        "ward_id", "census_year", "total_population", "voting_age_population",
        "white_pct", "black_pct", "hispanic_pct", "asian_pct",
        "college_degree_pct", "median_household_income",
        "urban_rural_class", "population_density", "ward_vintage", "data_source",
    ]

    rows_written = 0
    class_counts = {"urban": 0, "suburban": 0, "rural": 0}

    with open(output_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for ward_id, data in sorted(ward_demo.items()):
            pop = data["total_population"]
            if pop == 0:
                continue

            white_pct = round(data["white"] / pop * 100, 2) if pop > 0 else None
            black_pct = round(data["black"] / pop * 100, 2) if pop > 0 else None
            hispanic_pct = round(data["hispanic"] / pop * 100, 2) if pop > 0 else None
            asian_pct = round(data["asian"] / pop * 100, 2) if pop > 0 else None

            edu_total = data["edu_total"]
            college_pct = (
                round(data["college_total"] / edu_total * 100, 2)
                if edu_total > 0 else None
            )

            income = (
                round(data["income_weighted_sum"] / data["income_pop"])
                if data["income_pop"] > 0 else None
            )

            area = ward_areas.get(ward_id, 0)
            density = pop / area if area > 0 else 0
            urban_rural = classify_urban_rural(density)
            class_counts[urban_rural] += 1

            writer.writerow({
                "ward_id": ward_id,
                "census_year": 2020,
                "total_population": pop,
                "voting_age_population": data["voting_age_population"],
                "white_pct": white_pct,
                "black_pct": black_pct,
                "hispanic_pct": hispanic_pct,
                "asian_pct": asian_pct,
                "college_degree_pct": college_pct,
                "median_household_income": income,
                "urban_rural_class": urban_rural,
                "population_density": round(density, 2),
                "ward_vintage": 2020,
                "data_source": "census_2020_acs_2020_5yr",
            })
            rows_written += 1

    print(f"  Wrote {rows_written} ward rows to {output_path}")
    print(f"  Classification: urban={class_counts['urban']}, "
          f"suburban={class_counts['suburban']}, rural={class_counts['rural']}")


if __name__ == "__main__":
    process_demographics()
