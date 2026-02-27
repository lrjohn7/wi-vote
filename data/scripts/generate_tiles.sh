#!/usr/bin/env bash
# Generate PMTiles from ward boundary GeoJSON.
#
# Prerequisites:
#   - tippecanoe: https://github.com/felt/tippecanoe
#   - pmtiles CLI: https://github.com/protomaps/go-pmtiles
#
# Usage:
#   bash data/scripts/generate_tiles.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$(dirname "$SCRIPT_DIR")"
INPUT="$DATA_DIR/processed/wards_clean.geojson"
OUTPUT_MBTILES="$DATA_DIR/processed/wards.mbtiles"
OUTPUT_PMTILES="$DATA_DIR/processed/wards.pmtiles"
DEST="$SCRIPT_DIR/../../packages/client/public/tiles/wards.pmtiles"

if ! command -v tippecanoe &>/dev/null; then
    echo "ERROR: tippecanoe is not installed."
    echo "Install from: https://github.com/felt/tippecanoe"
    exit 1
fi

if ! command -v pmtiles &>/dev/null; then
    echo "ERROR: pmtiles CLI is not installed."
    echo "Install from: https://github.com/protomaps/go-pmtiles"
    exit 1
fi

if [ ! -f "$INPUT" ]; then
    echo "ERROR: Input file not found: $INPUT"
    echo "Run process_wards.py first to generate cleaned GeoJSON."
    exit 1
fi

echo "Generating vector tiles with Tippecanoe..."
tippecanoe -o "$OUTPUT_MBTILES" \
    --maximum-zoom=14 \
    --minimum-zoom=4 \
    --simplification=10 \
    --detect-shared-borders \
    --coalesce-densest-as-needed \
    --extend-zooms-if-still-dropping \
    --force \
    --layer=wards \
    --named-layer=wards:"$INPUT"

echo "Converting to PMTiles..."
pmtiles convert "$OUTPUT_MBTILES" "$OUTPUT_PMTILES"

echo "Copying to client public/tiles/..."
mkdir -p "$(dirname "$DEST")"
cp "$OUTPUT_PMTILES" "$DEST"

echo "Done. Tiles at: $DEST"
