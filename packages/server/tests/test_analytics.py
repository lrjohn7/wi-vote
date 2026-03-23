"""Tests for analytics API endpoints."""
import pytest


@pytest.mark.asyncio
async def test_dashboard_rejects_missing_key(client):
    response = await client.get("/api/v1/analytics/dashboard")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_dashboard_rejects_invalid_key(client):
    response = await client.get(
        "/api/v1/analytics/dashboard",
        headers={"X-Admin-Analytics-Key": "wrong-key"},
    )
    assert response.status_code == 403
    assert "Invalid" in response.json()["detail"]


@pytest.mark.asyncio
async def test_dashboard_uses_header_not_query(client):
    """Verify the key must be sent as a header, not a query param."""
    response = await client.get("/api/v1/analytics/dashboard?key=anything")
    # Should still fail — key in query is ignored
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_ingest_events_accepts_valid_batch(client):
    response = await client.post(
        "/api/v1/analytics/events",
        json={
            "events": [
                {
                    "session_id": "abc123",
                    "event_type": "pageview",
                    "page_path": "/map",
                    "device_type": "desktop",
                }
            ]
        },
    )
    assert response.status_code == 202
    data = response.json()
    assert data["ok"] is True
    assert data["count"] == 1
