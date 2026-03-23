"""Tests for report card API endpoint."""
import pytest


@pytest.mark.asyncio
async def test_report_card_not_found(client):
    response = await client.get("/api/v1/wards/NONEXISTENT-WARD/report-card")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_report_card_structure(client):
    """If wards exist in test DB, verify report card response structure."""
    # First get a valid ward_id
    wards_response = await client.get("/api/v1/wards?limit=1")
    if wards_response.status_code != 200:
        pytest.skip("No wards endpoint available")
    wards_data = wards_response.json()
    if not wards_data.get("wards"):
        pytest.skip("No wards in test database")

    ward_id = wards_data["wards"][0]["ward_id"]
    response = await client.get(f"/api/v1/wards/{ward_id}/report-card")
    assert response.status_code == 200
    data = response.json()
    assert "metadata" in data
    assert "partisan_lean" in data
    assert "trend" in data
    assert "elections" in data
    assert "comparisons" in data
