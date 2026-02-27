"""Tests for ward API endpoints."""
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.asyncio
async def test_list_wards(client):
    async with client as c:
        response = await c.get("/api/v1/wards")
    assert response.status_code == 200
    data = response.json()
    assert "wards" in data
    assert "total" in data
    assert "page" in data


@pytest.mark.asyncio
async def test_list_wards_with_filters(client):
    async with client as c:
        response = await c.get("/api/v1/wards?county=Dane&page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert data["page_size"] == 10


@pytest.mark.asyncio
async def test_search_wards(client):
    async with client as c:
        response = await c.get("/api/v1/wards/search?q=Madison")
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert data["query"] == "Madison"


@pytest.mark.asyncio
async def test_search_wards_too_short(client):
    async with client as c:
        response = await c.get("/api/v1/wards/search?q=M")
    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_get_ward_not_found(client):
    async with client as c:
        response = await c.get("/api/v1/wards/nonexistent")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_geocode_missing_params(client):
    async with client as c:
        response = await c.get("/api/v1/wards/geocode")
    assert response.status_code == 422  # Missing required params


@pytest.mark.asyncio
async def test_boundaries_endpoint(client):
    async with client as c:
        response = await c.get("/api/v1/wards/boundaries")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert "features" in data
