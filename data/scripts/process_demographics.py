"""Process Census demographics into ward-level demographics.

Usage:
    python data/scripts/process_demographics.py

Two-stage approach:
  1. PL94 race/population data: downloaded directly at VTD level from Census API,
     matched to our ward_ids by ward name within each county.
  2. ACS education/income data: available only at block-group level, so we use
     the BAF crosswalk to map block groups -> VTDs -> ward_ids.

Classifies urban/suburban/rural using population density thresholds:
  - >3000/sq mi = urban
  - >500/sq mi = suburban
  - else = rural

Outputs data/processed/ward_demographics.csv.
"""

import csv
import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

import httpx

RAW_DIR = Path(__file__).resolve().parent.parent / "raw" / "demographics"
PROCESSED_DIR = Path(__file__).resolve().parent.parent / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

WARDS_DIR = Path(__file__).resolve().parent.parent / "processed"

DENSITY_URBAN = 3000  # people per sq mile
DENSITY_SUBURBAN = 500


def load_ward_name_to_id() -> dict[str, dict[str, str]]:
    """Build county -> {ward_name_normalized -> ward_id} lookup from our GeoJSON.

    Returns: {county_fips(5): {normalized_name: ward_id}}
    """
    lookup: dict[str, dict[str, str]] = defaultdict(dict)

    for vintage in [2020]:
        filepath = WARDS_DIR / f"wards_{vintage}.geojson"
        if not filepath.exists():
            continue

        with open(filepath) as f:
            geojson = json.load(f)

        for feat in geojson["features"]:
            p = feat["properties"]
            ward_id = p.get("ward_id", "")
            ward_name = p.get("ward_name", "")
            if ward_id and ward_name:
                county_fips = ward_id[:5]
                normalized = normalize_name(ward_name)
                lookup[county_fips][normalized] = ward_id

    total = sum(len(v) for v in lookup.values())
    print(f"  Built name lookup for {total} wards across {len(lookup)} counties")
    return lookup


def normalize_name(name: str) -> str:
    """Normalize ward name for matching: lowercase, collapse whitespace."""
    return re.sub(r"\s+", " ", name.strip().lower())


def download_vtd_pl94() -> list[dict]:
    """Download PL94 data at VTD level from Census API.

    Returns list of dicts with keys: state, county, vtd, name,
    total_population, voting_age_population, white, black, asian, hispanic.
    """
    cache_path = RAW_DIR / "census_2020_pl94_vtd.json"

    if cache_path.exists():
        with open(cache_path) as f:
            data = json.load(f)
        if len(data) > 100:
            print(f"  Using cached VTD PL94 data ({len(data) - 1} rows)")
            header = data[0]
            rows = data[1:]
            return _parse_pl94_vtd(header, rows)

    url = "https://api.census.gov/data/2020/dec/pl"
    api_key = os.environ.get("CENSUS_API_KEY", "")
    params = {
        "get": "P1_001N,P1_003N,P1_004N,P1_006N,P2_002N,P3_001N,NAME",
        "for": "voting district:*",
        "in": "state:55",
    }
    if api_key:
        params["key"] = api_key

    print("  Downloading PL94 at VTD level from Census API...")
    with httpx.Client() as client:
        resp = client.get(url, params=params, timeout=120)
        resp.raise_for_status()
        data = resp.json()

    with open(cache_path, "w") as f:
        json.dump(data, f)

    header = data[0]
    rows = data[1:]
    print(f"  Downloaded {len(rows)} VTDs")
    return _parse_pl94_vtd(header, rows)


def _parse_pl94_vtd(header: list[str], rows: list[list[str]]) -> list[dict]:
    """Parse PL94 VTD Census API response into dicts."""
    idx = {col: i for i, col in enumerate(header)}
    result = []
    for row in rows:
        total_pop = int(row[idx["P1_001N"]] or 0)
        name_full = row[idx["NAME"]]
        # NAME format: "Adams - C 0001, Adams County, Wisconsin"
        # Extract ward name (everything before the first comma)
        ward_name = name_full.split(",")[0].strip()

        result.append({
            "state": row[idx["state"]],
            "county": row[idx["county"]],
            "vtd": row[idx["voting district"]],
            "name": ward_name,
            "total_population": total_pop,
            "voting_age_population": int(row[idx["P3_001N"]] or 0),
            "white": int(row[idx["P1_003N"]] or 0),
            "black": int(row[idx["P1_004N"]] or 0),
            "asian": int(row[idx["P1_006N"]] or 0),
            "hispanic": int(row[idx["P2_002N"]] or 0),
        })
    return result


def build_vtd_to_ward_id(
    vtd_data: list[dict],
    name_lookup: dict[str, dict[str, str]],
) -> dict[str, str]:
    """Build (county_fips + vtd_code) -> ward_id mapping using name matching.

    Returns: {"55001000018": "55001002750001", ...}
    """
    mapping: dict[str, str] = {}
    matched = 0
    unmatched = 0

    for vtd in vtd_data:
        county_fips = f"{vtd['state']}{vtd['county']}"
        vtd_key = f"{county_fips}{vtd['vtd']}"
        normalized = normalize_name(vtd["name"])

        county_wards = name_lookup.get(county_fips, {})
        ward_id = county_wards.get(normalized)

        if ward_id:
            mapping[vtd_key] = ward_id
            matched += 1
        else:
            unmatched += 1

    print(f"  VTD->ward_id: matched={matched}, unmatched={unmatched}")
    return mapping


def load_baf_crosswalk(
    vtd_to_ward: dict[str, str],
) -> dict[str, str]:
    """Build block_group -> ward_id mapping using BAF + VTD->ward_id mapping.

    Uses the BAF VTD file to map block groups to VTDs, then the VTD->ward_id
    mapping to get the final ward_id.
    """
    baf_candidates = list(RAW_DIR.glob("*VTD*.txt")) + list(RAW_DIR.glob("*vtd*.txt"))
    if not baf_candidates:
        print("  WARNING: No BAF VTD file found")
        return {}

    baf_path = baf_candidates[0]
    print(f"  Loading BAF from {baf_path.name}...")

    # Map each block to its VTD key (county_fips + vtd_code)
    bg_to_vtd_key: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    with open(baf_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f, delimiter="|")
        next(reader)  # skip header
        for row in reader:
            if len(row) < 3:
                continue
            block_id = row[0].strip()
            county_fp = row[1].strip()
            vtd_code = row[2].strip()
            if len(block_id) >= 12 and vtd_code:
                bg_id = block_id[:12]
                state_county = block_id[:5]
                vtd_key = f"{state_county}{vtd_code}"
                bg_to_vtd_key[bg_id][vtd_key] += 1

    # For each block group, pick the most common VTD, then map to ward_id
    bg_to_ward: dict[str, str] = {}
    mapped = 0
    unmapped = 0

    for bg_id, vtd_counts in bg_to_vtd_key.items():
        best_vtd_key = max(vtd_counts, key=vtd_counts.get)
        ward_id = vtd_to_ward.get(best_vtd_key)
        if ward_id:
            bg_to_ward[bg_id] = ward_id
            mapped += 1
        else:
            unmapped += 1

    print(f"  Block group -> ward_id: mapped={mapped}, unmapped={unmapped}")
    return bg_to_ward


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

    # Step 1: Build ward name -> ward_id lookup from our GeoJSON
    print("\n[Building ward name lookup]")
    name_lookup = load_ward_name_to_id()

    # Step 2: Download/load PL94 at VTD level (race, population)
    print("\n[Loading PL94 at VTD level]")
    vtd_data = download_vtd_pl94()

    # Step 3: Build VTD -> ward_id mapping using name matching
    print("\n[Building VTD -> ward_id mapping]")
    vtd_to_ward = build_vtd_to_ward_id(vtd_data, name_lookup)

    # Step 4: Build PL94 demographics per ward (direct from VTD data)
    print("\n[Building ward demographics from PL94 VTD data]")
    ward_demo: dict[str, dict] = {}

    for vtd in vtd_data:
        county_fips = f"{vtd['state']}{vtd['county']}"
        vtd_key = f"{county_fips}{vtd['vtd']}"
        ward_id = vtd_to_ward.get(vtd_key)
        if not ward_id:
            continue

        ward_demo[ward_id] = {
            "total_population": vtd["total_population"],
            "voting_age_population": vtd["voting_age_population"],
            "white": vtd["white"],
            "black": vtd["black"],
            "asian": vtd["asian"],
            "hispanic": vtd["hispanic"],
            "edu_total": 0,
            "college_total": 0,
            "income_weighted_sum": 0,
            "income_pop": 0,
        }

    print(f"  {len(ward_demo)} wards with PL94 data")

    # Step 5: Load ACS block-group data and aggregate to wards
    print("\n[Loading ACS block-group data]")
    acs_header, acs_rows = load_census_json("acs_2020_5yr.json")

    if acs_header and acs_rows:
        print("\n[Building block-group -> ward_id crosswalk]")
        bg_to_ward = load_baf_crosswalk(vtd_to_ward)

        print("\n[Aggregating ACS data to ward level]")
        acs_idx = {col: i for i, col in enumerate(acs_header)}
        acs_mapped = 0

        for row in acs_rows:
            bg_id = f"{row[acs_idx['state']]}{row[acs_idx['county']]}{row[acs_idx['tract']]}{row[acs_idx['block group']]}"
            ward_id = bg_to_ward.get(bg_id)
            if not ward_id or ward_id not in ward_demo:
                continue

            acs_mapped += 1
            w = ward_demo[ward_id]

            edu_total = int(row[acs_idx.get("B15003_001E", 0)] or 0)
            bachelors = int(row[acs_idx.get("B15003_022E", 0)] or 0)
            masters = int(row[acs_idx.get("B15003_023E", 0)] or 0)
            professional = int(row[acs_idx.get("B15003_024E", 0)] or 0)
            doctorate = int(row[acs_idx.get("B15003_025E", 0)] or 0)

            w["edu_total"] += edu_total
            w["college_total"] += bachelors + masters + professional + doctorate

            income_raw = row[acs_idx.get("B19013_001E", 0)]
            if income_raw and income_raw not in ("-666666666", ""):
                pop = int(row[acs_idx.get("B01003_001E", 0)] or 0) if "B01003_001E" in acs_idx else 0
                if pop > 0:
                    w["income_weighted_sum"] += int(income_raw) * pop
                    w["income_pop"] += pop

        print(f"  Mapped {acs_mapped} block groups to wards with ACS data")

    # Step 6: Load ward areas for density classification
    print("\n[Loading Ward Areas]")
    ward_areas = load_ward_areas()

    # Step 7: Write output CSV
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

            white_pct = round(data["white"] / pop * 100, 2)
            black_pct = round(data["black"] / pop * 100, 2)
            hispanic_pct = round(data["hispanic"] / pop * 100, 2)
            asian_pct = round(data["asian"] / pop * 100, 2)

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

    print(f"\n  Wrote {rows_written} ward rows to {output_path}")
    print(f"  Classification: urban={class_counts['urban']}, "
          f"suburban={class_counts['suburban']}, rural={class_counts['rural']}")


if __name__ == "__main__":
    process_demographics()
