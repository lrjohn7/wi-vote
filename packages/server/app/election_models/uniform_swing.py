"""Server-side uniform swing model using NumPy for batch computation."""

import numpy as np
from numpy.typing import NDArray


def uniform_swing(
    dem_votes: NDArray[np.int64],
    rep_votes: NDArray[np.int64],
    total_votes: NDArray[np.int64],
    swing_points: float,
    turnout_change: float = 0.0,
) -> dict[str, NDArray[np.float64]]:
    """Apply uniform swing to ward-level election data.

    Args:
        dem_votes: Array of Democratic vote counts per ward.
        rep_votes: Array of Republican vote counts per ward.
        total_votes: Array of total vote counts per ward.
        swing_points: Swing in percentage points (positive = D, negative = R).
        turnout_change: Percentage change in turnout (e.g., 5.0 = +5%).

    Returns:
        Dictionary with projected arrays: dem_pct, rep_pct, margin,
        dem_votes, rep_votes, total_votes.
    """
    swing = swing_points / 100.0
    turnout_multiplier = 1.0 + turnout_change / 100.0

    two_party = dem_votes + rep_votes
    base_dem_share = np.where(two_party > 0, dem_votes / two_party, 0.5)

    adjusted_dem_share = np.clip(base_dem_share + swing, 0.01, 0.99)

    proj_total = np.round(total_votes * turnout_multiplier).astype(np.int64)
    proj_two_party = np.round(two_party * turnout_multiplier).astype(np.int64)

    proj_dem = np.round(proj_two_party * adjusted_dem_share).astype(np.int64)
    proj_rep = proj_two_party - proj_dem

    return {
        "dem_pct": np.where(proj_total > 0, proj_dem / proj_total * 100, 50.0),
        "rep_pct": np.where(proj_total > 0, proj_rep / proj_total * 100, 50.0),
        "margin": np.where(
            proj_total > 0, (proj_dem - proj_rep) / proj_total * 100, 0.0
        ),
        "dem_votes": proj_dem,
        "rep_votes": proj_rep,
        "total_votes": proj_total,
    }
