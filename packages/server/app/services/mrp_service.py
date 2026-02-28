"""MRP model prediction service.

Loads pre-fitted traces and generates predictions with post-hoc adjustments.
"""

from __future__ import annotations

import logging
from typing import Any

import pandas as pd
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.election_models.mrp_storage import (
    list_fitted_models,
    load_metadata,
    load_trace,
)

logger = logging.getLogger(__name__)

# Region mapping (matches data/scripts/fit_mrp_models.py)
MILWAUKEE_METRO = {
    "Milwaukee", "Waukesha", "Ozaukee", "Washington", "Racine", "Kenosha",
}
MADISON_METRO = {"Dane", "Columbia", "Iowa", "Green", "Sauk", "Rock"}
FOX_VALLEY = {
    "Outagamie", "Winnebago", "Calumet", "Brown", "Manitowoc",
    "Sheboygan", "Fond du Lac",
}


def _county_to_region(county: str) -> str:
    c = county.strip()
    if c in MILWAUKEE_METRO:
        return "milwaukee_metro"
    if c in MADISON_METRO:
        return "madison_metro"
    if c in FOX_VALLEY:
        return "fox_valley"
    return "rural"


class MrpService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_fitted_models(self) -> list[dict]:
        """List all pre-fitted MRP models available for prediction."""
        return list_fitted_models()

    async def predict(
        self,
        year: int,
        race_type: str,
        adjustments: dict[str, Any] | None = None,
    ) -> dict:
        """Run MRP prediction for a given election with adjustments.

        Returns predictions dict plus metadata.
        """
        ward_vintage = 2022 if year >= 2022 else 2020

        # Load pre-fitted trace
        trace = load_trace(race_type, year, ward_vintage)
        if trace is None:
            raise ValueError(
                f"No fitted MRP model for {race_type} {year} "
                f"(vintage {ward_vintage}). Run fit_mrp_models.py first."
            )

        # Load ward data for prediction
        ward_df = await self._load_ward_data(year, race_type, ward_vintage)
        if ward_df.empty:
            raise ValueError(f"No ward data found for {race_type} {year}")

        # Lazy import — pymc/arviz only available in Docker
        from app.election_models.mrp_model import predict_mrp

        # Run predictions
        predictions = predict_mrp(trace, ward_df, adjustments)

        # Get diagnostics from metadata
        meta = load_metadata(race_type, year, ward_vintage) or {}
        diagnostics = {
            k: meta.get(k)
            for k in ["r_hat_max", "ess_min", "draws", "chains"]
            if k in meta
        }

        return {
            "model_id": "mrp",
            "predictions": predictions,
            "metadata": {
                "year": year,
                "race_type": race_type,
                "ward_vintage": ward_vintage,
                "ward_count": len(predictions),
                **diagnostics,
            },
        }

    async def get_fit_status(self, task_id: str) -> dict:
        """Check the status of a Celery fitting task."""
        try:
            from app.core.celery_app import celery_app
        except ImportError:
            return {"task_id": task_id, "status": "UNAVAILABLE", "error": "Celery not installed"}

        result = celery_app.AsyncResult(task_id)
        response: dict[str, Any] = {
            "task_id": task_id,
            "status": result.status,
        }

        if result.ready():
            if result.successful():
                response["result"] = result.result
            else:
                response["error"] = str(result.result)

        if result.status == "PROGRESS" and result.info:
            response["progress"] = result.info

        return response

    async def _load_ward_data(
        self, year: int, race_type: str, ward_vintage: int
    ) -> pd.DataFrame:
        """Load joined election + demographics data via async SQLAlchemy."""
        query = text("""
            SELECT
                er.ward_id,
                w.county,
                w.municipality,
                er.dem_votes,
                er.rep_votes,
                er.total_votes,
                er.is_estimate,
                COALESCE(wd.population_density, 0) AS population_density,
                COALESCE(wd.college_degree_pct, 0) AS college_degree_pct,
                COALESCE(wd.median_household_income, 0) AS median_household_income,
                COALESCE(wd.white_pct, 0) AS white_pct
            FROM election_results er
            JOIN wards w
                ON er.ward_id = w.ward_id AND er.ward_vintage = w.ward_vintage
            LEFT JOIN ward_demographics wd
                ON er.ward_id = wd.ward_id AND wd.ward_vintage = w.ward_vintage
            WHERE er.election_year = :year
                AND er.race_type = :race_type
                AND er.ward_vintage = :ward_vintage
                AND er.total_votes > 0
        """)

        result = await self.db.execute(
            query,
            {"year": year, "race_type": race_type, "ward_vintage": ward_vintage},
        )
        rows = result.mappings().all()

        if not rows:
            return pd.DataFrame()

        df = pd.DataFrame([dict(r) for r in rows])
        df["region"] = df["county"].apply(_county_to_region)
        return df
