"""Download Census 2020 PL94 and ACS 5-year demographic data for Wisconsin.

Usage:
    python data/scripts/download_demographics.py

Downloads block-group level data from the Census API:
  - Census 2020 PL94-171: population by race
  - ACS 2020 5-year: education, income
Saves raw JSON to data/raw/demographics/.

Requires CENSUS_API_KEY environment variable (get one at https://api.census.gov/data/key_signup.html).
"""

import json
import os
import sys
from pathlib import Path

import httpx

RAW_DIR = Path(__file__).resolve().parent.parent / "raw" / "demographics"
RAW_DIR.mkdir(parents=True, exist_ok=True)

CENSUS_API_KEY = os.environ.get("CENSUS_API_KEY", "")
WISCONSIN_FIPS = "55"

# Census 2020 PL94-171 Redistricting Data
# P1_001N = Total population
# P1_003N = White alone
# P1_004N = Black alone
# P1_006N = Asian alone
# P2_002N = Hispanic or Latino
# P3_001N = Total voting age population
PL94_VARIABLES = "P1_001N,P1_003N,P1_004N,P1_006N,P2_002N,P3_001N"
PL94_URL = "https://api.census.gov/data/2020/dec/pl"

# ACS 2020 5-year at block group level
# B15003_001E = Total population 25+ (education universe)
# B15003_022E = Bachelor's degree
# B15003_023E = Master's degree
# B15003_024E = Professional school degree
# B15003_025E = Doctorate degree
# B19013_001E = Median household income
# B01003_001E = Total population (for density)
ACS_VARIABLES = "B15003_001E,B15003_022E,B15003_023E,B15003_024E,B15003_025E,B19013_001E,B01003_001E"
ACS_URL = "https://api.census.gov/data/2020/acs/acs5"


def download_census_data(
    url: str,
    variables: str,
    output_name: str,
    client: httpx.Client,
) -> bool:
    """Download Census data for all Wisconsin block groups."""
    output_path = RAW_DIR / f"{output_name}.json"

    if output_path.exists():
        with open(output_path) as f:
            existing = json.load(f)
        if len(existing) > 100:
            print(f"  SKIP {output_name}: already downloaded ({len(existing) - 1} rows)")
            return True

    params = {
        "get": variables,
        "for": "block group:*",
        "in": f"state:{WISCONSIN_FIPS}&in=county:*&in=tract:*",
    }
    if CENSUS_API_KEY:
        params["key"] = CENSUS_API_KEY

    print(f"  Requesting {url}...")
    response = client.get(url, params=params, timeout=120)
    response.raise_for_status()
    data = response.json()

    with open(output_path, "w") as f:
        json.dump(data, f)

    row_count = len(data) - 1  # Subtract header row
    print(f"  Saved {row_count} block groups to {output_path}")
    return True


def download_block_to_ward_crosswalk(client: httpx.Client) -> bool:
    """Download block-to-ward assignment file from Census.

    The Census Bureau provides block assignment files (BAF) that map
    Census blocks to voting districts (VTDs/wards).
    """
    output_path = RAW_DIR / "block_ward_crosswalk.txt"

    if output_path.exists():
        print("  SKIP block_ward_crosswalk: already downloaded")
        return True

    # Census Block Assignment Files (BAF) for Wisconsin
    # Maps 2020 Census blocks to 2020 VTDs (voting tabulation districts = wards)
    baf_url = (
        "https://www2.census.gov/geo/docs/maps-data/data/baf2020/"
        "BlockAssign_ST55_WI_VTD.zip"
    )

    print(f"  Requesting BAF from {baf_url}...")
    try:
        response = client.get(baf_url, timeout=120, follow_redirects=True)
        response.raise_for_status()

        zip_path = RAW_DIR / "block_ward_crosswalk.zip"
        with open(zip_path, "wb") as f:
            f.write(response.content)
        print(f"  Saved crosswalk ZIP ({len(response.content) / 1024:.0f} KB)")

        # Extract
        import zipfile
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(RAW_DIR)
            print(f"  Extracted: {[n for n in zf.namelist()]}")

        return True
    except Exception as e:
        print(f"  WARNING: Could not download BAF: {e}")
        print("  Crosswalk will need to be provided manually.")
        return False


def main() -> None:
    print("Census/ACS Demographic Data Download")
    print("=" * 60)

    if not CENSUS_API_KEY:
        print("WARNING: CENSUS_API_KEY not set. Requests may be rate-limited.")
        print("Get a key at https://api.census.gov/data/key_signup.html")
        print()

    results = {}

    with httpx.Client() as client:
        # 1. Census 2020 PL94 (race/ethnicity, voting age population)
        print("\n[Census 2020 PL94-171 — Race & Population]")
        try:
            success = download_census_data(
                PL94_URL, PL94_VARIABLES, "census_2020_pl94", client
            )
            results["census_2020_pl94"] = "OK" if success else "WARNING"
        except Exception as e:
            print(f"  ERROR: {e}")
            results["census_2020_pl94"] = f"FAILED: {e}"

        # 2. ACS 2020 5-year (education, income)
        print("\n[ACS 2020 5-Year — Education & Income]")
        try:
            success = download_census_data(
                ACS_URL, ACS_VARIABLES, "acs_2020_5yr", client
            )
            results["acs_2020_5yr"] = "OK" if success else "WARNING"
        except Exception as e:
            print(f"  ERROR: {e}")
            results["acs_2020_5yr"] = f"FAILED: {e}"

        # 3. Block-to-ward crosswalk
        print("\n[Block-to-Ward Crosswalk (BAF)]")
        try:
            success = download_block_to_ward_crosswalk(client)
            results["crosswalk"] = "OK" if success else "WARNING"
        except Exception as e:
            print(f"  ERROR: {e}")
            results["crosswalk"] = f"FAILED: {e}"

    print("\n" + "=" * 60)
    print("Summary:")
    for name, status in results.items():
        print(f"  {name}: {status}")


if __name__ == "__main__":
    main()
