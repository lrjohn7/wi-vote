"""Process downloaded LTSB ward data into normalized format.

Usage:
    python data/scripts/process_wards.py

Reads GeoJSON files from data/raw/ and produces cleaned data in data/processed/:
- wards_2020.geojson  — ward boundaries with identity columns (2020 vintage)
- wards_2022.geojson  — ward boundaries (2022 vintage)
- wards_2025.geojson  — ward boundaries (2025 vintage)
- election_results.csv — one row per ward per election per race
"""

import re
from pathlib import Path

import geopandas as gpd
import pandas as pd

RAW_DIR = Path(__file__).resolve().parent.parent / "raw"
PROCESSED_DIR = Path(__file__).resolve().parent.parent / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

# ── LTSB column mappings ────────────────────────────────────────────

# Office code -> race_type
OFFICE_CODES = {
    "PRE": "president",
    "GOV": "governor",
    "USS": "us_senate",
    "USH": "us_house",
    "WSS": "state_senate",
    "WSA": "state_assembly",
    "SOS": "secretary_of_state",
    "TRS": "treasurer",
    "WAG": "attorney_general",
}

# 2-digit year -> 4-digit year
def expand_year(yy: str) -> int:
    y = int(yy)
    return 2000 + y if y < 50 else 1900 + y


# Match only the columns we need: {OFFICE}DEM{YY}, {OFFICE}REP{YY}, {OFFICE}TOT{YY}
# Avoids matching DEM2, REP2, IND, LIB, GRN, etc.
ELECTION_COL_RE = re.compile(
    r"^(PRE|GOV|USS|USH|WSA|WSS|SOS|TRS|WAG)(DEM|REP|TOT)(\d{2})$",
    re.IGNORECASE,
)


def detect_election_columns(columns: list[str]) -> list[dict]:
    """Parse LTSB election column names into structured metadata."""
    results = []
    for col in columns:
        m = ELECTION_COL_RE.match(col)
        if m:
            office, party, yy = m.groups()
            office = office.upper()
            party = party.lower()
            if office in OFFICE_CODES:
                results.append({
                    "column": col,
                    "office": office,
                    "race_type": OFFICE_CODES[office],
                    "party": party,
                    "year": expand_year(yy),
                })
    return results


# ── District field detection ─────────────────────────────────────────

DISTRICT_FIELD_CANDIDATES = {
    "assembly_district": ["ASM", "ASM2011", "ASM2021"],
    "state_senate_district": ["SEN", "SEN2011", "SEN2021"],
    "congressional_district": ["CON", "CON2011", "CON2021"],
}


def find_field(columns: list[str], candidates: list[str]) -> str | None:
    """Find the first matching column from a list of candidates (case-insensitive)."""
    col_upper = {c.upper(): c for c in columns}
    for candidate in candidates:
        if candidate.upper() in col_upper:
            return col_upper[candidate.upper()]
    return None


def process_dataset(filename: str, ward_vintage: int) -> tuple[gpd.GeoDataFrame, pd.DataFrame]:
    """Process a single LTSB GeoJSON file into ward boundaries + election results."""
    filepath = RAW_DIR / filename
    if not filepath.exists():
        print(f"  SKIP: {filepath} not found")
        return gpd.GeoDataFrame(), pd.DataFrame()

    print(f"  Loading {filepath.name}...")
    gdf = gpd.read_file(filepath)
    print(f"  Loaded {len(gdf)} features, {len(gdf.columns)} columns")

    cols = list(gdf.columns)

    # ── Ward identity ──
    geoid_col = find_field(cols, ["GEOID", "GEOID20", "GEOID22"])
    if not geoid_col:
        print("  ERROR: No GEOID column found")
        return gpd.GeoDataFrame(), pd.DataFrame()

    gdf["ward_id"] = gdf[geoid_col].astype(str)

    label_col = find_field(cols, ["LABEL", "WARDLABEL"])
    gdf["ward_name"] = gdf[label_col].fillna("Unknown") if label_col else "Ward"

    mcd_col = find_field(cols, ["MCD_NAME", "MCD", "COUSUBNAME"])
    gdf["municipality"] = gdf[mcd_col].fillna("Unknown") if mcd_col else "Unknown"

    county_col = find_field(cols, ["CNTY_NAME", "COUNTY"])
    gdf["county"] = gdf[county_col].fillna("Unknown") if county_col else "Unknown"

    # ── District assignments ──
    asm_col = find_field(cols, DISTRICT_FIELD_CANDIDATES["assembly_district"])
    sen_col = find_field(cols, DISTRICT_FIELD_CANDIDATES["state_senate_district"])
    con_col = find_field(cols, DISTRICT_FIELD_CANDIDATES["congressional_district"])

    gdf["assembly_district"] = gdf[asm_col].astype(str).str.strip() if asm_col else None
    gdf["state_senate_district"] = gdf[sen_col].astype(str).str.strip() if sen_col else None
    gdf["congressional_district"] = gdf[con_col].astype(str).str.strip() if con_col else None

    print(f"  Districts: ASM={asm_col}, SEN={sen_col}, CON={con_col}")

    # ── Estimate detection ──
    ru_col = find_field(cols, ["RU", "REPORTING_UNIT"])
    if ru_col:
        # Semicolons in RU field -> combined reporting units -> estimates
        gdf["is_estimated"] = gdf[ru_col].fillna("").str.contains(";")
        est_count = gdf["is_estimated"].sum()
        print(f"  Estimated wards (from combined RUs): {est_count}")
    else:
        gdf["is_estimated"] = False

    # ── Municipality type from CTV field or ward name ──
    ctv_col = find_field(cols, ["CTV"])
    if ctv_col:
        ctv_map = {"C": "city", "V": "village", "T": "town"}
        gdf["municipality_type"] = gdf[ctv_col].map(ctv_map)
    else:
        def detect_mun_type(name: str) -> str | None:
            name = str(name).lower()
            if "city of" in name or "- c " in name:
                return "city"
            elif "village of" in name or "- v " in name:
                return "village"
            elif "town of" in name or "- t " in name:
                return "town"
            return None
        gdf["municipality_type"] = gdf["ward_name"].apply(detect_mun_type)

    # ── Area ──
    gdf_proj = gdf.to_crs(epsg=3070)
    gdf["area_sq_miles"] = gdf_proj.geometry.area / 2_589_988.11

    gdf["ward_vintage"] = ward_vintage

    # ── Ward boundaries output ──
    ward_cols = [
        "ward_id", "ward_name", "municipality", "municipality_type", "county",
        "assembly_district", "state_senate_district", "congressional_district",
        "ward_vintage", "area_sq_miles", "is_estimated", "geometry",
    ]
    wards_gdf = gdf[[c for c in ward_cols if c in gdf.columns]].copy()

    # ── Election results extraction ──
    election_cols = detect_election_columns(cols)
    print(f"  Election columns matched: {len(election_cols)}")

    if not election_cols:
        print("  WARNING: No election columns detected!")
        return wards_gdf, pd.DataFrame()

    # Group columns by (year, race_type)
    election_map: dict[tuple[int, str], dict[str, str | None]] = {}
    for ec in election_cols:
        key = (ec["year"], ec["race_type"])
        if key not in election_map:
            election_map[key] = {"dem": None, "rep": None, "tot": None}
        election_map[key][ec["party"]] = ec["column"]

    elections_found = sorted(election_map.keys())
    print(f"  Elections found: {elections_found}")

    # Build result rows
    all_results = []
    for (year, race_type), col_map in election_map.items():
        dem_col = col_map["dem"]
        rep_col = col_map["rep"]
        tot_col = col_map["tot"]

        if not dem_col or not rep_col:
            continue

        dem_series = pd.to_numeric(gdf[dem_col], errors="coerce").fillna(0).astype(int)
        rep_series = pd.to_numeric(gdf[rep_col], errors="coerce").fillna(0).astype(int)

        if tot_col:
            tot_series = pd.to_numeric(gdf[tot_col], errors="coerce").fillna(0).astype(int)
        else:
            tot_series = dem_series + rep_series

        other_series = (tot_series - dem_series - rep_series).clip(lower=0)

        # Build DataFrame for this election
        election_df = pd.DataFrame({
            "ward_id": gdf["ward_id"],
            "election_year": year,
            "race_type": race_type,
            "dem_votes": dem_series,
            "rep_votes": rep_series,
            "other_votes": other_series,
            "total_votes": tot_series,
            "is_estimate": gdf["is_estimated"],
            "data_source": "ltsb",
            "ward_vintage": ward_vintage,
        })

        # Only keep wards with votes
        election_df = election_df[election_df["total_votes"] > 0]
        all_results.append(election_df)

    if all_results:
        results_df = pd.concat(all_results, ignore_index=True)
        print(f"  Total result rows: {len(results_df)}")
    else:
        results_df = pd.DataFrame()
        print("  No results generated")

    return wards_gdf, results_df


def main() -> None:
    print("Ward Data Processing Pipeline")
    print("=" * 60)

    datasets = [
        ("elections_2012_2020_wards2020.geojson", 2020),
        ("elections_2002_2010_wards2020.geojson", 2020),
        ("elections_2022_wards2022.geojson", 2022),
        ("elections_2024_wards2025.geojson", 2025),
    ]

    all_wards: dict[int, gpd.GeoDataFrame] = {}
    all_results: list[pd.DataFrame] = []

    for filename, vintage in datasets:
        print(f"\n{'-' * 60}")
        print(f"Processing {filename} (vintage={vintage})")
        wards_gdf, results_df = process_dataset(filename, vintage)

        if not wards_gdf.empty:
            # Keep first ward boundaries per vintage (geometries are identical across
            # election datasets of the same vintage)
            if vintage not in all_wards:
                all_wards[vintage] = wards_gdf
        if not results_df.empty:
            all_results.append(results_df)

    # ── Save ward boundaries ──
    for vintage, wards_gdf in all_wards.items():
        output = PROCESSED_DIR / f"wards_{vintage}.geojson"
        wards_gdf = wards_gdf.set_crs(epsg=4326, allow_override=True)
        wards_gdf.to_file(output, driver="GeoJSON")
        print(f"\nSaved {len(wards_gdf)} ward boundaries -> {output.name}")

    # ── Save clean boundaries for tile generation ──
    primary_vintage = 2020 if 2020 in all_wards else next(iter(all_wards))
    clean = all_wards[primary_vintage][
        ["ward_id", "ward_name", "municipality", "county", "geometry"]
    ].copy()
    clean = clean.set_crs(epsg=4326, allow_override=True)
    clean.to_file(PROCESSED_DIR / "wards_clean.geojson", driver="GeoJSON")
    print(f"Saved clean boundaries -> wards_clean.geojson")

    # ── Merge and save election results ──
    if all_results:
        combined = pd.concat(all_results, ignore_index=True)
        combined = combined.drop_duplicates(
            subset=["ward_id", "election_year", "race_type", "ward_vintage"],
            keep="first",
        )
        output = PROCESSED_DIR / "election_results.csv"
        combined.to_csv(output, index=False)
        print(f"\nSaved {len(combined)} election result rows -> {output.name}")

        # Summary
        print("\n" + "=" * 60)
        print("Election Results Summary:")
        for (year, race), group in combined.groupby(["election_year", "race_type"]):
            dem = group["dem_votes"].sum()
            rep = group["rep_votes"].sum()
            total = group["total_votes"].sum()
            wards = len(group)
            print(f"  {year} {race:20s}: {wards:5d} wards, DEM={dem:>10,} REP={rep:>10,}")
    else:
        print("\nWARNING: No election results extracted!")

    # ── Validation ──
    if all_results:
        print("\nValidation — Key race statewide totals:")
        checks = [
            (2020, "president", "Biden ~1,630,866 / Trump ~1,610,184"),
            (2024, "president", "Harris ~1,576,014 / Trump ~1,660,843"),
            (2016, "president", "Clinton ~1,382,536 / Trump ~1,405,284"),
        ]
        for year, race, expected in checks:
            subset = combined[
                (combined["election_year"] == year) & (combined["race_type"] == race)
            ]
            if subset.empty:
                print(f"  {year} {race}: NO DATA")
            else:
                dem = subset["dem_votes"].sum()
                rep = subset["rep_votes"].sum()
                print(f"  {year} {race}: DEM={dem:,} REP={rep:,}")
                print(f"    Expected: {expected}")

    print("\nDone.")


if __name__ == "__main__":
    main()
