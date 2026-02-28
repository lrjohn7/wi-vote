"""Celery tasks for MRP model fitting."""

from __future__ import annotations

import logging
import os
from pathlib import Path

from app.core.celery_app import celery_app

logger = logging.getLogger(__name__)

# Region mapping (same as mrp_service.py / fit_mrp_models.py)
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


@celery_app.task(bind=True, name="mrp.fit_model")
def fit_mrp_model_task(
    self,
    year: int,
    race_type: str,
    draws: int = 2000,
    tune: int = 1000,
) -> dict:
    """Async Celery task to fit an MRP model.

    This runs in the Celery worker process (not the async FastAPI process),
    so it uses sync database access via psycopg2.
    """
    import pandas as pd
    import psycopg2

    from app.election_models.mrp_model import (
        fit_mrp_model,
        get_diagnostics,
    )
    from app.election_models.mrp_storage import save_trace

    ward_vintage = 2022 if year >= 2022 else 2020

    # Use sync DB connection (Celery worker)
    db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql://postgres:password@localhost:5432/wivote",
    )
    db_url = db_url.replace("+asyncpg", "").replace("+psycopg2", "")

    self.update_state(state="PROGRESS", meta={"step": "loading_data"})

    conn = psycopg2.connect(db_url)
    try:
        query = """
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
            WHERE er.election_year = %s
                AND er.race_type = %s
                AND er.ward_vintage = %s
                AND er.total_votes > 0
        """
        df = pd.read_sql(query, conn, params=(year, race_type, ward_vintage))
    finally:
        conn.close()

    if df.empty or len(df) < 100:
        return {
            "status": "failed",
            "error": f"Insufficient data for {race_type} {year} ({len(df)} wards)",
        }

    df["region"] = df["county"].apply(_county_to_region)

    self.update_state(
        state="PROGRESS",
        meta={"step": "fitting", "ward_count": len(df)},
    )

    try:
        trace = fit_mrp_model(df, draws=draws, tune=tune, chains=2)
    except Exception as e:
        logger.exception("MRP fitting failed for %s %s", race_type, year)
        return {"status": "failed", "error": str(e)}

    diag = get_diagnostics(trace)

    self.update_state(state="PROGRESS", meta={"step": "saving"})

    save_trace(trace, race_type, year, ward_vintage, metadata=diag)

    return {
        "status": "success",
        "race_type": race_type,
        "year": year,
        "ward_vintage": ward_vintage,
        "diagnostics": diag,
    }
