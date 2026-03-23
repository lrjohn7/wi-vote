"""Tests for ward notes API endpoints."""
import pytest


@pytest.mark.asyncio
async def test_get_notes_for_ward(client):
    response = await client.get("/api/v1/ward-notes?ward_id=55025-MADISON-W001")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_create_note_rejects_url_content(client):
    response = await client.post(
        "/api/v1/ward-notes",
        json={
            "ward_id": "55025-MADISON-W001",
            "author_name": "Tester",
            "content": "Check out https://spam.com for more info",
            "category": "local_knowledge",
        },
    )
    assert response.status_code == 422 or response.status_code == 400


@pytest.mark.asyncio
async def test_create_note_rejects_short_content(client):
    response = await client.post(
        "/api/v1/ward-notes",
        json={
            "ward_id": "55025-MADISON-W001",
            "author_name": "Tester",
            "content": "short",
            "category": "local_knowledge",
        },
    )
    assert response.status_code == 422 or response.status_code == 400


@pytest.mark.asyncio
async def test_create_note_rejects_nonexistent_ward(client):
    """After fix #12, creating a note for a non-existent ward returns 404."""
    response = await client.post(
        "/api/v1/ward-notes",
        json={
            "ward_id": "FAKE-WARD-999",
            "author_name": "Tester",
            "content": "This ward does not exist in the database at all",
            "category": "local_knowledge",
        },
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_note_requires_admin_key(client):
    response = await client.delete("/api/v1/ward-notes/99999")
    assert response.status_code == 403
