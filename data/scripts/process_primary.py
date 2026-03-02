"""Process downloaded OpenElections primary CSVs and create merged reporting-unit geometries.

Usage:
    python data/scripts/process_primary.py             # Process all years
    python data/scripts/process_primary.py --year 2022  # Process single year

Reads raw primary CSV files from data/raw/primary/ and produces:
- data/processed/primary_results.csv        -- one row per RU per candidate per year
- data/processed/primary_wards.geojson      -- dissolved RU geometries
- data/processed/reporting_unit_mapping.csv -- RU-to-ward matching details

Input format (OpenElections CSV):
    county,ward,office,district,total votes,party,candidate,votes
    Adams,Town Of Adams Wards 1-3,Governor,,133,DEM,Tony Evers,46
"""

import argparse
import hashlib
import re
import sys
from pathlib import Path
from typing import Optional

import geopandas as gpd
import pandas as pd
from shapely.geometry import MultiPolygon
from shapely.ops import unary_union

RAW_DIR = Path(__file__).resolve().parent.parent / "raw" / "primary"
PROCESSED_DIR = Path(__file__).resolve().parent.parent / "processed"
WARDS_GEOJSON = PROCESSED_DIR / "wards_2020.geojson"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)


# -- Reporting unit name parsing ------------------------------------------

# Matches: "City Of Milwaukee Ward 1", "Town Of Adams Wards 1-3", etc.
RU_PATTERN = re.compile(
    r"^(City|Town|Village)\s+[Oo]f\s+(.+?)\s+Wards?\s+(.+)$",
    re.IGNORECASE,
)

RANGE_PATTERN = re.compile(r"(\d+)\s*-\s*(\d+)")
SINGLE_PATTERN = re.compile(r"\d+")


def parse_ward_numbers(ward_spec: str) -> list[int]:
    """Parse a ward specifier string into a sorted list of ward numbers.

    Examples:
        "1-3"     -> [1, 2, 3]
        "1 & 2"   -> [1, 2]
        "1, 3, 5" -> [1, 3, 5]
        "1-3, 5"  -> [1, 2, 3, 5]
    """
    numbers: set[int] = set()

    # Expand ranges like "1-3" or "1 - 4"
    spec_expanded = ward_spec
    for match in RANGE_PATTERN.finditer(ward_spec):
        start = int(match.group(1))
        end = int(match.group(2))
        for n in range(start, end + 1):
            numbers.add(n)
        spec_expanded = spec_expanded.replace(match.group(0), "", 1)

    # Pick up remaining single numbers
    for match in SINGLE_PATTERN.finditer(spec_expanded):
        numbers.add(int(match.group(0)))

    return sorted(numbers)


def parse_ru_name(ru_name: str) -> Optional[dict]:
    """Parse a reporting unit name into its components.

    Returns dict with keys: mun_type, mun_name, ward_numbers, or None.
    """
    match = RU_PATTERN.match(ru_name.strip())
    if not match:
        return None

    mun_type = match.group(1).lower()
    mun_name = match.group(2).strip()
    ward_spec = match.group(3).strip()

    ward_numbers = parse_ward_numbers(ward_spec)
    if not ward_numbers:
        return None

    return {
        "mun_type": mun_type,
        "mun_name": mun_name,
        "ward_numbers": ward_numbers,
    }


def generate_ru_id(county: str, ru_name: str) -> str:
    """Generate a stable reporting unit ID from county and RU name."""
    key = f"{county.lower().strip()}|{ru_name.lower().strip()}"
    return hashlib.md5(key.encode("utf-8")).hexdigest()[:12]


MUN_TYPE_ABBREV = {
    "city": "C",
    "town": "T",
    "village": "V",
}


# -- Ward boundary loading and indexing -----------------------------------

def load_ward_boundaries(ward_geojson_path: Path) -> gpd.GeoDataFrame:
    """Load ward boundaries GeoJSON and return a GeoDataFrame."""
    print(f"  Loading ward boundaries from {ward_geojson_path.name}...")
    gdf = gpd.read_file(ward_geojson_path)
    print(f"  Loaded {len(gdf)} ward features")
    return gdf


def extract_ward_number(ward_name: str) -> Optional[int]:
    """Extract the ward number from a ward_name like Adams - C 0001."""
    parts = ward_name.rsplit(" ", 1)
    if len(parts) == 2:
        try:
            return int(parts[1])
        except ValueError:
            return None
    return None


def extract_mun_type_abbrev(ward_name: str) -> Optional[str]:
    """Extract municipality type abbreviation (C/T/V) from ward_name."""
    match = re.search(r"\s-\s([CTV])\s", ward_name)
    if match:
        return match.group(1)
    return None


def build_ward_index(
    gdf: gpd.GeoDataFrame,
) -> dict[tuple[str, str, str, int], str]:
    """Build lookup: (county_lower, mun_lower, mun_type_abbrev, ward_num) -> ward_id."""
    index: dict[tuple[str, str, str, int], str] = {}

    for _, row in gdf.iterrows():
        ward_name = str(row.get("ward_name", ""))
        municipality = str(row.get("municipality", ""))
        county = str(row.get("county", ""))
        ward_id = str(row.get("ward_id", ""))

        ward_num = extract_ward_number(ward_name)
        mun_type = extract_mun_type_abbrev(ward_name)

        if ward_num is not None and mun_type is not None:
            key = (
                county.lower().strip(),
                municipality.lower().strip(),
                mun_type,
                ward_num,
            )
            index[key] = ward_id

    return index


def normalize_county_name(county: str) -> str:
    """Normalize a county name for matching."""
    name = county.strip()
    name = re.sub(r"\bDu\b", "du", name)
    return name


# -- Matching logic -------------------------------------------------------

def match_ru_to_wards(
    county: str,
    ru_name: str,
    parsed: dict,
    ward_index: dict[tuple[str, str, str, int], str],
    wards_gdf: gpd.GeoDataFrame,
) -> tuple[list[str], str]:
    """Match a reporting unit to ward IDs using the ward index.

    Returns (list_of_ward_ids, match_quality).
    match_quality is one of: exact, fuzzy, unmatched.
    """
    mun_type = parsed["mun_type"]
    mun_name = parsed["mun_name"]
    ward_numbers = parsed["ward_numbers"]

    mun_type_abbrev = MUN_TYPE_ABBREV.get(mun_type, "")
    county_lower = county.lower().strip()
    mun_lower = mun_name.lower().strip()

    matched_ids: list[str] = []

    # Attempt exact match
    for ward_num in ward_numbers:
        key = (county_lower, mun_lower, mun_type_abbrev, ward_num)
        if key in ward_index:
            matched_ids.append(ward_index[key])

    if matched_ids:
        if len(matched_ids) == len(ward_numbers):
            return matched_ids, "exact"
        else:
            return matched_ids, "fuzzy"

    # Fuzzy matching: try alternate municipality name forms
    fuzzy_mun_variants = _generate_mun_variants(mun_lower)

    for variant in fuzzy_mun_variants:
        variant_matched: list[str] = []
        for ward_num in ward_numbers:
            key = (county_lower, variant, mun_type_abbrev, ward_num)
            if key in ward_index:
                variant_matched.append(ward_index[key])
        if variant_matched:
            return variant_matched, "fuzzy"

    # Cross-county matching: some municipalities span counties
    cross_county: list[str] = []
    for ward_num in ward_numbers:
        for (c, m, t, n), wid in ward_index.items():
            if m == mun_lower and t == mun_type_abbrev and n == ward_num:
                cross_county.append(wid)
                break
    if cross_county:
        return cross_county, "fuzzy"

    return [], "unmatched"


def _generate_mun_variants(mun_lower: str) -> list[str]:
    """Generate alternative municipality name spellings for fuzzy matching."""
    variants: list[str] = []

    if mun_lower.startswith("st."):
        variants.append("saint" + mun_lower[3:])
        variants.append("st" + mun_lower[3:])
    elif mun_lower.startswith("st "):
        variants.append("saint " + mun_lower[3:])
        variants.append("st. " + mun_lower[3:])
    elif mun_lower.startswith("saint "):
        variants.append("st. " + mun_lower[6:])
        variants.append("st " + mun_lower[6:])

    cleaned = mun_lower.replace("-", " ").replace(".", "")
    if cleaned != mun_lower:
        variants.append(cleaned)

    if "mt." in mun_lower or "mt " in mun_lower:
        variants.append(mun_lower.replace("mt.", "mount").replace("mt ", "mount "))
    if "mount " in mun_lower:
        variants.append(mun_lower.replace("mount ", "mt. "))

    return variants


# -- Geometry dissolution -------------------------------------------------

def dissolve_ward_geometries(
    ward_ids: list[str],
    wards_gdf: gpd.GeoDataFrame,
) -> Optional[MultiPolygon]:
    """Dissolve multiple ward geometries into a single MultiPolygon."""
    subset = wards_gdf[wards_gdf["ward_id"].isin(ward_ids)]
    if subset.empty:
        return None

    geoms = subset.geometry.tolist()
    if not geoms:
        return None

    merged = unary_union(geoms)

    if merged.geom_type == "Polygon":
        merged = MultiPolygon([merged])
    elif merged.geom_type != "MultiPolygon":
        polys = [g for g in merged.geoms if g.geom_type in ("Polygon", "MultiPolygon")]
        if polys:
            merged = unary_union(polys)
            if merged.geom_type == "Polygon":
                merged = MultiPolygon([merged])
        else:
            return None

    return merged


# -- CSV loading ----------------------------------------------------------

def detect_year_from_filename(filename: str) -> Optional[int]:
    """Extract election year from an OpenElections CSV filename.

    Handles multiple naming conventions:
        20220809__wi__primary__ward.csv -> 2022
        primary_2018_ward.csv          -> 2018
    """
    # Standard OpenElections format: YYYYMMDD__wi__primary__ward.csv
    match = re.match(r"^(\d{4})\d{4}__wi__primary", filename)
    if match:
        return int(match.group(1))
    # Alternative format: primary_YYYY_ward.csv
    match = re.search(r"primary_(\d{4})", filename)
    if match:
        return int(match.group(1))
    # Fallback: any 4-digit year at the start
    match = re.match(r"^(\d{4})", filename)
    if match:
        return int(match.group(1))
    return None


def load_primary_csvs(
    raw_dir: Path,
    target_year: Optional[int] = None,
) -> pd.DataFrame:
    """Load and combine primary CSV files from the raw directory."""
    csv_files = sorted(raw_dir.glob("*.csv"))

    if not csv_files:
        print(f"  ERROR: No CSV files found in {raw_dir}")
        sys.exit(1)

    all_dfs: list[pd.DataFrame] = []

    for csv_file in csv_files:
        year = detect_year_from_filename(csv_file.name)
        if year is None:
            print(f"  SKIP: Cannot detect year from {csv_file.name}")
            continue

        if target_year is not None and year != target_year:
            continue

        print(f"  Loading {csv_file.name} (year={year})...")
        try:
            df = pd.read_csv(csv_file, encoding="utf-8", dtype=str)
        except UnicodeDecodeError:
            df = pd.read_csv(csv_file, encoding="latin-1", dtype=str)

        # Normalize column names
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

        col_map = {}
        for col in df.columns:
            if col in ("ward", "precinct", "reporting_unit"):
                col_map[col] = "ward"
            elif col == "total_votes":
                col_map[col] = "total_votes"

        df = df.rename(columns=col_map)

        required = {"county", "ward", "office", "party", "candidate", "votes"}
        missing = required - set(df.columns)
        if missing:
            print(f"    WARNING: Missing columns {missing} in {csv_file.name}, skipping")
            continue

        df["election_year"] = year
        df["votes"] = pd.to_numeric(df["votes"], errors="coerce").fillna(0).astype(int)
        if "total_votes" in df.columns:
            df["total_votes"] = (
                pd.to_numeric(df["total_votes"], errors="coerce").fillna(0).astype(int)
            )

        rows_before = len(df)
        all_dfs.append(df)
        print(f"    Loaded {rows_before} rows")

    if not all_dfs:
        print("  ERROR: No data loaded")
        sys.exit(1)

    combined = pd.concat(all_dfs, ignore_index=True)
    print(f"  Combined: {len(combined)} total rows across {len(all_dfs)} file(s)")
    return combined


# -- Main processing pipeline --------------------------------------------

def filter_governor_dem(df: pd.DataFrame) -> pd.DataFrame:
    """Filter to Governor race, DEM party only."""
    mask_office = df["office"].str.strip().str.lower() == "governor"
    mask_party = df["party"].str.strip().str.upper() == "DEM"

    filtered = df[mask_office & mask_party].copy()
    print(f"  Filtered to Governor DEM: {len(filtered)} rows")
    return filtered


def compute_ru_totals(df: pd.DataFrame) -> pd.DataFrame:
    """Compute per-reporting-unit totals and candidate percentages."""
    ru_totals = (
        df.groupby(["county", "ward", "election_year"])["votes"]
        .sum()
        .reset_index()
        .rename(columns={"votes": "ru_total_votes"})
    )

    ru_n_cands = (
        df.groupby(["county", "ward", "election_year"])["candidate"]
        .nunique()
        .reset_index()
        .rename(columns={"candidate": "n_candidates"})
    )

    result = df.merge(ru_totals, on=["county", "ward", "election_year"], how="left")
    result = result.merge(ru_n_cands, on=["county", "ward", "election_year"], how="left")

    result["vote_pct"] = result.apply(
        lambda row: round(row["votes"] / row["ru_total_votes"] * 100, 2)
        if row["ru_total_votes"] > 0
        else 0.0,
        axis=1,
    )

    return result


def process_matching_and_geometry(
    df: pd.DataFrame,
    wards_gdf: gpd.GeoDataFrame,
    ward_index: dict[tuple[str, str, str, int], str],
) -> tuple[pd.DataFrame, gpd.GeoDataFrame, pd.DataFrame]:
    """Match reporting units to wards and create dissolved geometries."""
    unique_rus = (
        df[["county", "ward"]]
        .drop_duplicates()
        .reset_index(drop=True)
    )
    print(f"  Unique reporting units: {len(unique_rus)}")

    mapping_rows: list[dict] = []
    geometry_rows: list[dict] = []

    matched_count = 0
    unmatched_count = 0
    total_votes_matched = 0
    total_votes_all = 0

    ru_vote_sums = (
        df.groupby(["county", "ward"])["votes"]
        .sum()
        .reset_index()
        .rename(columns={"votes": "total_votes_all_years"})
    )
    ru_vote_lookup = dict(
        zip(
            zip(ru_vote_sums["county"], ru_vote_sums["ward"]),
            ru_vote_sums["total_votes_all_years"],
        )
    )

    for _, row in unique_rus.iterrows():
        county_raw = str(row["county"]).strip()
        ru_name_raw = str(row["ward"]).strip()

        county_normalized = normalize_county_name(county_raw)
        ru_id = generate_ru_id(county_normalized, ru_name_raw)

        ru_votes = ru_vote_lookup.get((county_raw, ru_name_raw), 0)
        total_votes_all += ru_votes

        parsed = parse_ru_name(ru_name_raw)

        if parsed is None:
            mapping_rows.append({
                "ru_name": ru_name_raw,
                "county": county_normalized,
                "ru_id": ru_id,
                "matched_ward_ids": "",
                "n_wards_matched": 0,
                "match_quality": "unmatched",
            })
            unmatched_count += 1
            continue

        matched_ids, quality = match_ru_to_wards(
            county_normalized, ru_name_raw, parsed, ward_index, wards_gdf
        )

        mapping_rows.append({
            "ru_name": ru_name_raw,
            "county": county_normalized,
            "ru_id": ru_id,
            "matched_ward_ids": ",".join(matched_ids),
            "n_wards_matched": len(matched_ids),
            "match_quality": quality,
        })

        if matched_ids:
            matched_count += 1
            total_votes_matched += ru_votes

            dissolved = dissolve_ward_geometries(matched_ids, wards_gdf)
            if dissolved is not None:
                geometry_rows.append({
                    "ru_id": ru_id,
                    "ru_name": ru_name_raw,
                    "county": county_normalized,
                    "constituent_ward_ids": matched_ids,
                    "n_constituent_wards": len(matched_ids),
                    "geometry": dissolved,
                })
        else:
            unmatched_count += 1

    total_rus = matched_count + unmatched_count
    match_rate = matched_count / total_rus * 100 if total_rus > 0 else 0
    vote_coverage = (
        total_votes_matched / total_votes_all * 100 if total_votes_all > 0 else 0
    )

    print()
    print("  Matching Summary:")
    print(f"    Total RUs:        {total_rus}")
    print(f"    Matched:          {matched_count} ({match_rate:.1f}%)")
    print(f"    Unmatched:        {unmatched_count}")
    print(f"    Vote coverage:    {vote_coverage:.1f}% of total votes in matched RUs")

    mapping_df = pd.DataFrame(mapping_rows)

    if geometry_rows:
        ru_gdf = gpd.GeoDataFrame(geometry_rows, geometry="geometry", crs="EPSG:4326")
        ru_gdf["constituent_ward_ids"] = ru_gdf["constituent_ward_ids"].apply(
            lambda ids: ",".join(ids)
        )
    else:
        ru_gdf = gpd.GeoDataFrame(
            columns=[
                "ru_id", "ru_name", "county", "constituent_ward_ids",
                "n_constituent_wards", "geometry",
            ],
            geometry="geometry",
            crs="EPSG:4326",
        )

    ru_id_map = dict(zip(
        zip(mapping_df["ru_name"], mapping_df["county"]),
        mapping_df["ru_id"],
    ))
    df["ru_id"] = df.apply(
        lambda row: ru_id_map.get(
            (str(row["ward"]).strip(), normalize_county_name(str(row["county"]).strip())),
            generate_ru_id(
                normalize_county_name(str(row["county"]).strip()),
                str(row["ward"]).strip(),
            ),
        ),
        axis=1,
    )

    return df, ru_gdf, mapping_df


def print_unmatched_report(mapping_df: pd.DataFrame, df: pd.DataFrame) -> None:
    """Print the top unmatched reporting units by total votes."""
    unmatched = mapping_df[mapping_df["match_quality"] == "unmatched"].copy()
    if unmatched.empty:
        print()
        print("  All reporting units matched!")
        return

    unmatched_votes: list[dict] = []
    for _, row in unmatched.iterrows():
        ru_name = row["ru_name"]
        ru_data = df[df["ward"].str.strip() == ru_name]
        total = ru_data["votes"].sum() if not ru_data.empty else 0
        unmatched_votes.append({
            "ru_name": ru_name,
            "county": row["county"],
            "total_votes": total,
        })

    uv_df = pd.DataFrame(unmatched_votes).sort_values("total_votes", ascending=False)

    print()
    print("  Top 20 Unmatched Reporting Units (by votes):")
    for i, (_, row) in enumerate(uv_df.head(20).iterrows()):
        county_val = row["county"]
        ru_val = row["ru_name"]
        votes_val = row["total_votes"]
        print(f"    {i + 1:3d}. [{county_val}] {ru_val} ({votes_val:,} votes)")


def save_outputs(
    results_df: pd.DataFrame,
    ru_gdf: gpd.GeoDataFrame,
    mapping_df: pd.DataFrame,
) -> None:
    """Save processed outputs to data/processed/."""
    output_cols = [
        "election_year", "county", "ward", "ru_id", "candidate",
        "votes", "ru_total_votes", "vote_pct", "n_candidates",
    ]

    results_out = results_df[
        [c for c in output_cols if c in results_df.columns]
    ].copy()
    results_out = results_out.rename(columns={
        "ward": "reporting_unit",
        "ru_total_votes": "total_votes",
    })

    results_path = PROCESSED_DIR / "primary_results.csv"
    results_out.to_csv(results_path, index=False, encoding="utf-8")
    print()
    print(f"  Saved {len(results_out)} rows -> {results_path.name}")

    geo_path = PROCESSED_DIR / "primary_wards.geojson"
    if not ru_gdf.empty:
        ru_gdf.to_file(geo_path, driver="GeoJSON")
        print(f"  Saved {len(ru_gdf)} RU geometries -> {geo_path.name}")
    else:
        print("  WARNING: No RU geometries to save")

    mapping_path = PROCESSED_DIR / "reporting_unit_mapping.csv"
    mapping_df.to_csv(mapping_path, index=False, encoding="utf-8")
    print(f"  Saved {len(mapping_df)} mappings -> {mapping_path.name}")


def print_summary(results_df: pd.DataFrame, mapping_df: pd.DataFrame) -> None:
    """Print a comprehensive summary of the processed data."""
    print()
    print("=" * 60)
    print("Processing Summary")
    print("=" * 60)

    if "election_year" in results_df.columns:
        years = sorted(results_df["election_year"].unique())
        print()
        print(f"  Years processed: {years}")

        for year in years:
            year_data = results_df[results_df["election_year"] == year]
            n_rus = year_data[["county", "ward"]].drop_duplicates().shape[0]
            n_cands = year_data["candidate"].nunique()
            total_votes = year_data["votes"].sum()
            print(
                f"    {year}: {n_rus} RUs, {n_cands} candidates,"
                f" {total_votes:,} total votes"
            )

            cand_votes = (
                year_data.groupby("candidate")["votes"]
                .sum()
                .sort_values(ascending=False)
            )
            for cand, votes in cand_votes.head(5).items():
                pct = votes / total_votes * 100 if total_votes > 0 else 0
                print(f"      {cand}: {votes:,} ({pct:.1f}%)")

    if not mapping_df.empty:
        quality_counts = mapping_df["match_quality"].value_counts()
        print()
        print("  Match Quality Distribution:")
        for quality, count in quality_counts.items():
            pct = count / len(mapping_df) * 100
            print(f"    {quality}: {count} ({pct:.1f}%)")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Process OpenElections primary CSVs and create merged RU geometries."
    )
    parser.add_argument(
        "--year",
        type=int,
        default=None,
        help="Process a single year only (e.g., --year 2022)",
    )
    args = parser.parse_args()

    print("Primary Election Processing Pipeline")
    print("=" * 60)

    # Check for input files
    if not RAW_DIR.exists():
        print()
        print(f"ERROR: Raw primary directory not found: {RAW_DIR}")
        print("  Create it and add OpenElections CSV files:")
        print(f"    mkdir -p {RAW_DIR}")
        print("  Download from: https://github.com/openelections/openelections-data-wi")
        sys.exit(1)

    csv_files = list(RAW_DIR.glob("*.csv"))
    if not csv_files:
        print()
        print(f"ERROR: No CSV files found in {RAW_DIR}")
        print("  Expected files like: 20220809__wi__primary__ward.csv")
        sys.exit(1)

    print()
    print(f"Found {len(csv_files)} CSV file(s) in {RAW_DIR}")
    for f in sorted(csv_files):
        print(f"  {f.name}")

    # Check for ward boundaries
    if not WARDS_GEOJSON.exists():
        print()
        print(f"ERROR: Ward boundaries not found: {WARDS_GEOJSON}")
        print("  Run data/scripts/process_wards.py first to generate ward boundaries.")
        sys.exit(1)

    # Step 1: Load CSV data
    print()
    print("=" * 60)
    print("Step 1: Loading primary CSV data")
    raw_df = load_primary_csvs(RAW_DIR, target_year=args.year)

    # Step 2: Filter to Governor DEM
    print()
    print("=" * 60)
    print("Step 2: Filtering to Governor DEM primary")
    filtered_df = filter_governor_dem(raw_df)

    if filtered_df.empty:
        print("  ERROR: No Governor DEM rows found after filtering.")
        print("  Check that input CSVs have office and party columns.")
        sys.exit(1)

    # Step 3: Compute per-RU totals
    print()
    print("=" * 60)
    print("Step 3: Computing per-RU totals and candidate percentages")
    results_df = compute_ru_totals(filtered_df)

    # Step 4: Load ward boundaries and build index
    print()
    print("=" * 60)
    print("Step 4: Loading ward boundaries and building index")
    wards_gdf = load_ward_boundaries(WARDS_GEOJSON)
    ward_index = build_ward_index(wards_gdf)
    print(f"  Ward index: {len(ward_index)} entries")

    # Step 5: Match RUs to wards and dissolve geometries
    print()
    print("=" * 60)
    print("Step 5: Matching reporting units to wards and dissolving geometries")
    results_df, ru_gdf, mapping_df = process_matching_and_geometry(
        results_df, wards_gdf, ward_index
    )

    print_unmatched_report(mapping_df, results_df)

    # Step 6: Save outputs
    print()
    print("=" * 60)
    print("Step 6: Saving outputs")
    save_outputs(results_df, ru_gdf, mapping_df)

    print_summary(results_df, mapping_df)

    print()
    print("Done.")


if __name__ == "__main__":
    main()
