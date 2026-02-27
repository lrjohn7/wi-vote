"""Download ward boundary and election data from the LTSB ArcGIS Open Data Portal.

Usage:
    python data/scripts/download_ltsb.py

This script downloads GeoJSON data from the LTSB ArcGIS REST API,
handling pagination for large datasets (server max ~2000 records per request).
Datasets are saved to data/raw/.
"""

import json
import sys
from pathlib import Path

import httpx

RAW_DIR = Path(__file__).resolve().parent.parent / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

# ArcGIS REST service base — all LTSB election layers live under this org
ARCGIS_BASE = "https://services1.arcgis.com/FDsAtKBk8Hy4cAH0/arcgis/rest/services"

# LTSB ArcGIS REST endpoints for ward-level election data
# Service names verified via ArcGIS REST directory
DATASETS = {
    "elections_2012_2020_wards2020": {
        "service": "2012_to_2020_Election_Data_with_2020_Wards",
        "description": "2012-2020 Election Data with 2020 Wards (~7,078 features)",
        "expected_count": 7078,
        "ward_vintage": 2020,
    },
    "elections_2002_2010_wards2020": {
        "service": "2002_to_2010_Election_Data_with_2020_Wards",
        "description": "2002-2010 Election Data with 2020 Wards (~7,078 features)",
        "expected_count": 7078,
        "ward_vintage": 2020,
    },
    "elections_2022_wards2022": {
        "service": "2022_Election_Data_wtih_2022_Wards",
        "description": "2022 Election Data with 2022 Wards (~6,941 features)",
        "expected_count": 6941,
        "ward_vintage": 2022,
    },
    "elections_2024_wards2025": {
        "service": "2024_Election_Data_with_2025_Wards",
        "description": "2024 Election Data with 2025 Wards (~7,086 features)",
        "expected_count": 7086,
        "ward_vintage": 2025,
    },
}

PAGE_SIZE = 2000  # ArcGIS server max per request


def get_query_url(service_name: str) -> str:
    """Build the ArcGIS REST query URL for a feature service."""
    return f"{ARCGIS_BASE}/{service_name}/FeatureServer/0/query"


def get_feature_count(url: str, client: httpx.Client) -> int:
    """Query the server for total feature count before downloading."""
    params = {
        "where": "1=1",
        "returnCountOnly": "true",
        "f": "json",
    }
    response = client.get(url, params=params, timeout=30)
    response.raise_for_status()
    data = response.json()
    return data.get("count", 0)


def download_geojson(name: str, config: dict, client: httpx.Client) -> bool:
    """Download a dataset as GeoJSON from the ArcGIS REST API with pagination."""
    output_path = RAW_DIR / f"{name}.geojson"

    # Skip if already downloaded
    if output_path.exists():
        with open(output_path) as f:
            existing = json.load(f)
        existing_count = len(existing.get("features", []))
        if existing_count >= config["expected_count"] * 0.9:
            print(f"  SKIP {name}: already downloaded ({existing_count} features)")
            return True

    url = get_query_url(config["service"])

    # Get total count first
    total = get_feature_count(url, client)
    print(f"  Server reports {total} features")

    params = {
        "where": "1=1",
        "outFields": "*",
        "outSR": "4326",
        "f": "geojson",
        "resultRecordCount": PAGE_SIZE,
    }

    all_features: list[dict] = []
    offset = 0

    while offset < total:
        params["resultOffset"] = offset
        response = client.get(url, params=params, timeout=120)
        response.raise_for_status()
        data = response.json()

        features = data.get("features", [])
        if not features:
            break

        all_features.extend(features)
        offset += len(features)
        print(f"    Fetched {len(all_features)}/{total} features...")

    geojson = {
        "type": "FeatureCollection",
        "features": all_features,
    }

    with open(output_path, "w") as f:
        json.dump(geojson, f)

    count = len(all_features)
    print(f"  Saved {count} features to {output_path}")

    if count < config["expected_count"] * 0.9:
        print(f"  WARNING: Expected ~{config['expected_count']}, got {count}")
        return False

    return True


def main() -> None:
    print("LTSB Data Download")
    print("=" * 60)
    print()

    results = {}

    with httpx.Client() as client:
        for name, config in DATASETS.items():
            print(f"\n[{name}]")
            print(f"  {config['description']}")
            try:
                success = download_geojson(name, config, client)
                results[name] = "OK" if success else "WARNING: low count"
            except httpx.HTTPError as e:
                print(f"  ERROR: {e}")
                results[name] = f"FAILED: {e}"
            except Exception as e:
                print(f"  ERROR: {e}")
                results[name] = f"FAILED: {e}"

    print("\n" + "=" * 60)
    print("Summary:")
    for name, status in results.items():
        print(f"  {name}: {status}")

    # Check all downloaded files
    print("\nFiles in data/raw/:")
    for f in sorted(RAW_DIR.glob("*.geojson")):
        size_mb = f.stat().st_size / (1024 * 1024)
        with open(f) as fh:
            data = json.load(fh)
        count = len(data.get("features", []))
        print(f"  {f.name}: {count} features ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
