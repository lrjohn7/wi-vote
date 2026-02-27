"""Tests for election API endpoints."""
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.asyncio
async def test_list_elections(client):
    async with client as c:
        response = await c.get("/api/v1/elections")
    assert response.status_code == 200
    data = response.json()
    assert "elections" in data
    assert isinstance(data["elections"], list)


@pytest.mark.asyncio
async def test_get_election_results(client):
    async with client as c:
        response = await c.get("/api/v1/elections/2020/president")
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_get_map_data(client):
    async with client as c:
        response = await c.get("/api/v1/elections/map-data/2020/president")
    assert response.status_code == 200
    data = response.json()
    assert "year" in data
    assert "raceType" in data
    assert "wardCount" in data
    assert "data" in data


@pytest.mark.asyncio
async def test_get_map_data_structure(client):
    async with client as c:
        response = await c.get("/api/v1/elections/map-data/2020/president")
    data = response.json()
    if data["wardCount"] > 0:
        # Check first ward entry has expected fields
        first_key = next(iter(data["data"]))
        entry = data["data"][first_key]
        assert "demPct" in entry
        assert "repPct" in entry
        assert "margin" in entry
        assert "totalVotes" in entry
