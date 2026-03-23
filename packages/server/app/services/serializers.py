"""Shared serialization utilities for converting ORM models to API response dicts."""

from app.models.election_result import ElectionResult
from app.models.ward import Ward


def serialize_election(e: ElectionResult) -> dict:
    """Convert an ElectionResult ORM model to an API-ready dict."""
    return {
        "election_year": e.election_year,
        "race_type": e.race_type,
        "race_name": e.race_name,
        "dem_candidate": e.dem_candidate,
        "rep_candidate": e.rep_candidate,
        "dem_votes": e.dem_votes,
        "rep_votes": e.rep_votes,
        "other_votes": e.other_votes,
        "total_votes": e.total_votes,
        "dem_pct": round(e.dem_pct, 2),
        "rep_pct": round(e.rep_pct, 2),
        "margin": round(e.margin, 2),
        "is_estimate": e.is_estimate,
    }


def serialize_ward_meta(w: Ward) -> dict:
    """Convert a Ward ORM model to an API-ready metadata dict."""
    return {
        "ward_id": w.ward_id,
        "ward_name": w.ward_name,
        "municipality": w.municipality,
        "municipality_type": w.municipality_type,
        "county": w.county,
        "congressional_district": w.congressional_district,
        "state_senate_district": w.state_senate_district,
        "assembly_district": w.assembly_district,
        "ward_vintage": w.ward_vintage,
        "is_estimated": w.is_estimated,
    }
