"""Download ward boundary and election data from the LTSB ArcGIS Open Data Portal.

Usage:
    python data/scripts/download_ltsb.py

This script downloads GeoJSON data from the LTSB ArcGIS REST API.
Datasets are saved to data/raw/.
"""

import json
from pathlib import Path

import httpx

RAW_DIR = Path(__file__).resolve().parent.parent / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

# LTSB ArcGIS REST endpoints for ward-level election data
# These dataset IDs may change — verify at https://data-ltsb.opendata.arcgis.com
DATASETS = {
    # 2012-2020 elections mapped to 2020 ward boundaries
    "elections_2012_2020_wards2020": {
        "url": "https://data-ltsb.opendata.arcgis.com/datasets/{dataset_id}/FeatureServer/0/query",
        "dataset_id": "REPLACE_WITH_ACTUAL_DATASET_ID",
        "description": "2012-2020 Election Data with 2020 Wards",
    },
    # 2022 elections mapped to 2022 ward boundaries
    "elections_2022_wards2022": {
        "url": "https://data-ltsb.opendata.arcgis.com/datasets/{dataset_id}/FeatureServer/0/query",
        "dataset_id": "REPLACE_WITH_ACTUAL_DATASET_ID",
        "description": "2022 Election Data with 2022 Wards",
    },
}


def download_geojson(name: str, base_url: str, dataset_id: str) -> None:
    """Download a dataset as GeoJSON from the ArcGIS REST API."""
    if dataset_id.startswith("REPLACE"):
        print(f"  SKIP {name}: dataset ID not configured yet")
        return

    url = base_url.format(dataset_id=dataset_id)
    params = {
        "where": "1=1",
        "outFields": "*",
        "f": "geojson",
        "resultRecordCount": 1000,
        "resultOffset": 0,
    }

    all_features: list[dict] = []
    offset = 0

    print(f"  Downloading {name}...")
    while True:
        params["resultOffset"] = offset
        response = httpx.get(url, params=params, timeout=60)
        response.raise_for_status()
        data = response.json()

        features = data.get("features", [])
        if not features:
            break

        all_features.extend(features)
        offset += len(features)
        print(f"    Fetched {len(all_features)} features...")

        if len(features) < params["resultRecordCount"]:
            break

    geojson = {
        "type": "FeatureCollection",
        "features": all_features,
    }

    output_path = RAW_DIR / f"{name}.geojson"
    with open(output_path, "w") as f:
        json.dump(geojson, f)

    print(f"  Saved {len(all_features)} features to {output_path}")


def main() -> None:
    print("LTSB Data Download")
    print("=" * 40)
    print()
    print("NOTE: Before running, update the dataset IDs in this script.")
    print("Find them at: https://data-ltsb.opendata.arcgis.com")
    print()

    for name, config in DATASETS.items():
        download_geojson(name, config["url"], config["dataset_id"])

    print()
    print("Done.")


if __name__ == "__main__":
    main()
