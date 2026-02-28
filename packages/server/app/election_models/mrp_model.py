"""MRP (Multilevel Regression with Poststratification) election model.

Fits a hierarchical Bayesian model predicting ward-level two-party vote share
from demographic covariates and geographic random effects. The fitted trace
can then generate predictions with post-hoc adjustments for turnout and
demographic group shifts.
"""

from __future__ import annotations

import logging
from typing import Any

import arviz as az
import numpy as np
import pandas as pd
import pymc as pm

logger = logging.getLogger(__name__)

# Demographic covariate columns expected in ward_df
COVARIATES = [
    "log_population_density",
    "college_degree_pct",
    "median_household_income_scaled",
    "white_pct",
]

# Post-hoc adjustment mapping: param name -> covariate index in COVARIATES
ADJUSTMENT_MAP = {
    "collegeShift": 1,   # college_degree_pct
    "incomeShift": 2,    # median_household_income_scaled
}


def prepare_ward_df(ward_df: pd.DataFrame) -> pd.DataFrame:
    """Prepare a ward DataFrame with the required derived columns.

    Expects columns: ward_id, dem_votes, rep_votes, total_votes,
    county, population_density, college_degree_pct,
    median_household_income, white_pct, region
    """
    df = ward_df.copy()

    # Log population density (add 1 to avoid log(0))
    df["log_population_density"] = np.log1p(
        df["population_density"].fillna(0).clip(lower=0)
    )

    # Scale income to [0, 1] range
    income = df["median_household_income"].fillna(0)
    income_max = income.max()
    if income_max > 0:
        df["median_household_income_scaled"] = income / income_max
    else:
        df["median_household_income_scaled"] = 0.0

    # Fill NaNs in covariates
    for col in ["college_degree_pct", "white_pct"]:
        df[col] = df[col].fillna(df[col].median())

    # Compute two-party dem share
    two_party = df["dem_votes"] + df["rep_votes"]
    df["dem_two_party_share"] = np.where(
        two_party > 0,
        df["dem_votes"] / two_party,
        0.5,
    )

    # Clamp to avoid logit(-inf)/logit(inf)
    df["dem_two_party_share"] = df["dem_two_party_share"].clip(0.01, 0.99)

    # Encode county and region as integer codes
    df["county_code"] = pd.Categorical(df["county"]).codes
    df["region_code"] = pd.Categorical(df["region"]).codes

    return df


def build_mrp_model(ward_df: pd.DataFrame) -> pm.Model:
    """Construct the PyMC MRP model.

    Outcome: logit(dem_two_party_share) per ward
    Fixed effects: log(pop_density), college_pct, income_scaled, white_pct
    Random effects: county intercepts, region intercepts
    """
    df = prepare_ward_df(ward_df)

    n_counties = df["county_code"].nunique()
    n_regions = df["region_code"].nunique()

    # Covariate matrix
    X = df[COVARIATES].values.astype(np.float64)

    # Outcome on logit scale
    from scipy.special import logit  # type: ignore[import-untyped]
    y = logit(df["dem_two_party_share"].values)

    county_idx = df["county_code"].values
    region_idx = df["region_code"].values

    with pm.Model() as model:
        # Store metadata for prediction
        pm.Data("X_data", X)
        pm.Data("county_idx", county_idx)
        pm.Data("region_idx", region_idx)

        # Priors — fixed effects
        intercept = pm.Normal("intercept", mu=0, sigma=2)
        beta = pm.Normal("beta", mu=0, sigma=1, shape=len(COVARIATES))

        # Random effects — county
        sigma_county = pm.HalfNormal("sigma_county", sigma=1)
        county_effect = pm.Normal(
            "county_effect", mu=0, sigma=sigma_county, shape=n_counties
        )

        # Random effects — region
        sigma_region = pm.HalfNormal("sigma_region", sigma=1)
        region_effect = pm.Normal(
            "region_effect", mu=0, sigma=sigma_region, shape=n_regions
        )

        # Linear predictor
        mu = (
            intercept
            + pm.math.dot(X, beta)
            + county_effect[county_idx]
            + region_effect[region_idx]
        )

        # Observation noise
        sigma_obs = pm.HalfNormal("sigma_obs", sigma=1)

        # Likelihood (Normal on logit scale)
        pm.Normal("y_obs", mu=mu, sigma=sigma_obs, observed=y)

    return model


def fit_mrp_model(
    ward_df: pd.DataFrame,
    draws: int = 2000,
    tune: int = 1000,
    chains: int = 2,
    target_accept: float = 0.9,
) -> az.InferenceData:
    """Run MCMC sampling and return ArviZ InferenceData."""
    model = build_mrp_model(ward_df)

    with model:
        trace = pm.sample(
            draws=draws,
            tune=tune,
            chains=chains,
            target_accept=target_accept,
            return_inferencedata=True,
            progressbar=True,
        )

    # Log diagnostics
    summary = az.summary(trace, var_names=["intercept", "beta", "sigma_obs"])
    logger.info("MRP fit summary:\n%s", summary)

    rhat_max = float(summary["r_hat"].max())
    ess_min = float(summary["ess_bulk"].min())
    logger.info("R-hat max: %.3f, ESS min: %.0f", rhat_max, ess_min)

    return trace


def predict_mrp(
    trace: az.InferenceData,
    ward_df: pd.DataFrame,
    adjustments: dict[str, Any] | None = None,
) -> dict[str, dict[str, float]]:
    """Generate ward-level predictions from a fitted MRP trace.

    Args:
        trace: Fitted ArviZ InferenceData with posterior samples.
        ward_df: Ward data with same structure as training data.
        adjustments: Optional post-hoc adjustments:
            - turnoutChange: uniform % change in turnout
            - collegeShift: shift on college covariate (points)
            - urbanShift: shift applied to wards with density > 3000
            - ruralShift: shift applied to wards with density < 500
            - incomeShift: shift on income covariate (points)

    Returns:
        Dict keyed by ward_id with prediction fields.
    """
    from scipy.special import expit  # type: ignore[import-untyped]

    adjustments = adjustments or {}
    df = prepare_ward_df(ward_df)

    # Extract posterior means
    posterior = trace.posterior
    intercept = float(posterior["intercept"].mean())
    beta = posterior["beta"].mean(dim=["chain", "draw"]).values
    county_effect = posterior["county_effect"].mean(dim=["chain", "draw"]).values
    region_effect = posterior["region_effect"].mean(dim=["chain", "draw"]).values

    # Apply covariate-based adjustments to beta
    beta_adj = beta.copy()
    for param_name, cov_idx in ADJUSTMENT_MAP.items():
        shift = adjustments.get(param_name, 0)
        if shift != 0:
            # Convert points shift to coefficient adjustment
            # A 1-point shift means adding 0.01 to the logit-scale prediction per unit
            beta_adj[cov_idx] += shift * 0.04

    # Build linear predictor
    X = df[COVARIATES].values.astype(np.float64)
    county_idx = df["county_code"].values
    region_idx = df["region_code"].values

    mu = (
        intercept
        + X @ beta_adj
        + county_effect[county_idx]
        + region_effect[region_idx]
    )

    # Apply urban/rural shift directly to logit
    urban_shift = adjustments.get("urbanShift", 0)
    rural_shift = adjustments.get("ruralShift", 0)
    if urban_shift != 0 or rural_shift != 0:
        density = df["population_density"].fillna(0).values
        for i in range(len(mu)):
            if density[i] > 3000 and urban_shift != 0:
                mu[i] += urban_shift * 0.04
            elif density[i] < 500 and rural_shift != 0:
                mu[i] += rural_shift * 0.04

    # Convert logit to probability
    dem_two_party_share = expit(mu)

    # Turnout adjustment
    turnout_change = adjustments.get("turnoutChange", 0)
    turnout_multiplier = 1 + turnout_change / 100

    # Compute credible intervals from full posterior
    beta_samples = posterior["beta"].values  # (chains, draws, n_covariates)
    intercept_samples = posterior["intercept"].values  # (chains, draws)
    county_samples = posterior["county_effect"].values  # (chains, draws, n_counties)
    region_samples = posterior["region_effect"].values  # (chains, draws, n_regions)

    # Flatten chains
    n_chains, n_draws = intercept_samples.shape
    intercept_flat = intercept_samples.reshape(-1)
    beta_flat = beta_samples.reshape(-1, beta_samples.shape[-1])
    county_flat = county_samples.reshape(-1, county_samples.shape[-1])
    region_flat = region_samples.reshape(-1, region_samples.shape[-1])

    # Apply same adjustments to beta samples
    beta_flat_adj = beta_flat.copy()
    for param_name, cov_idx in ADJUSTMENT_MAP.items():
        shift = adjustments.get(param_name, 0)
        if shift != 0:
            beta_flat_adj[:, cov_idx] += shift * 0.04

    # Sample-level predictions (subsample for speed)
    n_samples = min(500, len(intercept_flat))
    sample_idx = np.linspace(0, len(intercept_flat) - 1, n_samples, dtype=int)

    mu_samples = np.zeros((n_samples, len(df)))
    for si, idx in enumerate(sample_idx):
        mu_samples[si] = (
            intercept_flat[idx]
            + X @ beta_flat_adj[idx]
            + county_flat[idx][county_idx]
            + region_flat[idx][region_idx]
        )
        # Apply urban/rural shifts
        if urban_shift != 0 or rural_shift != 0:
            density = df["population_density"].fillna(0).values
            for wi in range(len(df)):
                if density[wi] > 3000 and urban_shift != 0:
                    mu_samples[si, wi] += urban_shift * 0.04
                elif density[wi] < 500 and rural_shift != 0:
                    mu_samples[si, wi] += rural_shift * 0.04

    share_samples = expit(mu_samples)
    lower_share = np.percentile(share_samples, 5, axis=0)
    upper_share = np.percentile(share_samples, 95, axis=0)

    # Build predictions
    predictions: dict[str, dict[str, float]] = {}
    for i, row in df.iterrows():
        ward_id = str(row["ward_id"])
        total = int(row["total_votes"])
        two_party = int(row["dem_votes"]) + int(row["rep_votes"])

        projected_total = max(1, round(total * turnout_multiplier))
        projected_two_party = max(1, round(two_party * turnout_multiplier))
        other = projected_total - projected_two_party

        share = float(dem_two_party_share[i] if isinstance(i, int) else dem_two_party_share[df.index.get_loc(i)])
        idx_pos = df.index.get_loc(i) if not isinstance(i, int) else i
        low = float(lower_share[idx_pos])
        high = float(upper_share[idx_pos])

        dem_votes = round(projected_two_party * share)
        rep_votes = projected_two_party - dem_votes

        predictions[ward_id] = {
            "demPct": round(dem_votes / projected_total * 100, 2) if projected_total > 0 else 50.0,
            "repPct": round(rep_votes / projected_total * 100, 2) if projected_total > 0 else 50.0,
            "margin": round((dem_votes - rep_votes) / projected_total * 100, 2) if projected_total > 0 else 0.0,
            "demVotes": dem_votes,
            "repVotes": rep_votes,
            "totalVotes": projected_total,
            "confidence": 0.8,
            "lowerMargin": round((2 * low - 1) * 100, 2),
            "upperMargin": round((2 * high - 1) * 100, 2),
        }

    return predictions


def get_diagnostics(trace: az.InferenceData) -> dict[str, float]:
    """Extract key MCMC diagnostics from a fitted trace."""
    summary = az.summary(trace, var_names=["intercept", "beta", "sigma_obs"])
    return {
        "r_hat_max": round(float(summary["r_hat"].max()), 3),
        "ess_min": round(float(summary["ess_bulk"].min()), 0),
        "draws": int(trace.posterior.dims["draw"]),
        "chains": int(trace.posterior.dims["chain"]),
    }
