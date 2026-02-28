"""Save and load MRP model traces as NetCDF4 files."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import arviz as az

from app.core.config import settings

logger = logging.getLogger(__name__)


def _traces_dir() -> Path:
    """Get the traces directory, creating it if needed."""
    path = Path(settings.mrp_traces_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


def trace_filename(
    race_type: str, year: int, ward_vintage: int
) -> str:
    """Generate canonical trace filename."""
    return f"{race_type}_{year}_v{ward_vintage}.nc"


def metadata_filename(
    race_type: str, year: int, ward_vintage: int
) -> str:
    """Generate canonical metadata filename."""
    return f"{race_type}_{year}_v{ward_vintage}.json"


def save_trace(
    trace: az.InferenceData,
    race_type: str,
    year: int,
    ward_vintage: int,
    metadata: dict | None = None,
) -> Path:
    """Save a fitted MRP trace to disk.

    Args:
        trace: ArviZ InferenceData from PyMC sampling.
        race_type: Election race type (e.g., 'president').
        year: Election year.
        ward_vintage: Ward boundary vintage (e.g., 2020).
        metadata: Optional metadata dict (diagnostics, fit params, etc.).

    Returns:
        Path to the saved trace file.
    """
    traces_dir = _traces_dir()
    fname = trace_filename(race_type, year, ward_vintage)
    filepath = traces_dir / fname

    trace.to_netcdf(str(filepath))  # type: ignore[union-attr]
    logger.info("Saved MRP trace to %s", filepath)

    # Save metadata sidecar
    meta = metadata or {}
    meta.update({
        "race_type": race_type,
        "year": year,
        "ward_vintage": ward_vintage,
        "fitted_at": datetime.now(timezone.utc).isoformat(),
    })
    meta_path = traces_dir / metadata_filename(race_type, year, ward_vintage)
    meta_path.write_text(json.dumps(meta, indent=2))

    return filepath


def load_trace(
    race_type: str, year: int, ward_vintage: int
) -> az.InferenceData | None:
    """Load a fitted MRP trace from disk.

    Returns None if no trace file exists for the given parameters.
    """
    traces_dir = _traces_dir()
    fname = trace_filename(race_type, year, ward_vintage)
    filepath = traces_dir / fname

    if not filepath.exists():
        logger.warning("No trace found at %s", filepath)
        return None

    import arviz  # runtime import — only available in Docker with pymc installed

    trace = arviz.from_netcdf(str(filepath))
    logger.info("Loaded MRP trace from %s", filepath)
    return trace


def load_metadata(
    race_type: str, year: int, ward_vintage: int
) -> dict | None:
    """Load trace metadata sidecar file."""
    traces_dir = _traces_dir()
    meta_path = traces_dir / metadata_filename(race_type, year, ward_vintage)

    if not meta_path.exists():
        return None

    return json.loads(meta_path.read_text())


def list_fitted_models() -> list[dict]:
    """Scan the traces directory and return metadata for all fitted models."""
    traces_dir = _traces_dir()
    models = []

    for nc_file in sorted(traces_dir.glob("*.nc")):
        # Parse filename: {race_type}_{year}_v{vintage}.nc
        stem = nc_file.stem
        parts = stem.rsplit("_v", 1)
        if len(parts) != 2:
            continue

        try:
            ward_vintage = int(parts[1])
        except ValueError:
            continue

        race_year = parts[0]
        # Split race_type from year — year is always last segment
        rp = race_year.rsplit("_", 1)
        if len(rp) != 2:
            continue

        try:
            year = int(rp[1])
            race_type = rp[0]
        except ValueError:
            continue

        meta = load_metadata(race_type, year, ward_vintage) or {}
        models.append({
            "race_type": race_type,
            "year": year,
            "ward_vintage": ward_vintage,
            "fitted_at": meta.get("fitted_at"),
            "diagnostics": {
                k: meta.get(k)
                for k in ["r_hat_max", "ess_min", "draws", "chains"]
                if k in meta
            },
            "filename": nc_file.name,
        })

    return models
