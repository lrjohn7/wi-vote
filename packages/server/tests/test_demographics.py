"""Tests for demographics API endpoints."""
import pytest


@pytest.mark.asyncio
async def test_bulk_demographics_paginated(client):
    """Bulk endpoint should return pagination metadata."""
    response = await client.get("/api/v1/demographics/bulk?limit=10&offset=0")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "limit" in data
    assert data["limit"] == 10
    assert "offset" in data
    assert data["offset"] == 0
    assert "demographics" in data


@pytest.mark.asyncio
async def test_bulk_demographics_default_limit(client):
    """Bulk endpoint should use default limit of 1000."""
    response = await client.get("/api/v1/demographics/bulk")
    assert response.status_code == 200
    data = response.json()
    assert data["limit"] == 1000
    assert data["offset"] == 0


@pytest.mark.asyncio
async def test_ward_demographics_not_found(client):
    response = await client.get("/api/v1/demographics/ward/NONEXISTENT-WARD")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_demographics_summary(client):
    response = await client.get("/api/v1/demographics/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_wards" in data
    assert "classifications" in data
