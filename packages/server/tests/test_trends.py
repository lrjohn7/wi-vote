"""Tests for trends API endpoints."""
import pytest


@pytest.mark.asyncio
async def test_ward_trend_returns_structure(client):
    response = await client.get("/api/v1/trends/ward/NONEXISTENT-WARD")
    assert response.status_code == 200
    data = response.json()
    assert "ward_id" in data
    assert "trends" in data or "elections" in data


@pytest.mark.asyncio
async def test_bulk_elections_rejects_over_500(client):
    """After fix #20, >500 ward_ids returns 400 instead of silent truncation."""
    ward_ids = [f"WARD-{i}" for i in range(501)]
    response = await client.post(
        "/api/v1/trends/bulk-elections",
        json={"ward_ids": ward_ids},
    )
    assert response.status_code == 400
    assert "500" in response.json()["detail"]


@pytest.mark.asyncio
async def test_bulk_elections_accepts_valid(client):
    response = await client.post(
        "/api/v1/trends/bulk-elections",
        json={"ward_ids": ["55025-MADISON-W001"]},
    )
    assert response.status_code == 200
    data = response.json()
    assert "ward_count" in data
    assert "elections" in data


@pytest.mark.asyncio
async def test_volatility_endpoint(client):
    response = await client.get("/api/v1/trends/volatility?race_type=president")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_classify_endpoint(client):
    response = await client.get("/api/v1/trends/classify?race_type=president")
    assert response.status_code == 200
