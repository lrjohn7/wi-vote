"""Shared test fixtures.

Creates a fresh AsyncClient per test that properly disposes the asyncpg
connection pool, avoiding "another operation is in progress" errors.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.core.database import engine


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    # Dispose the connection pool after each test so the next test
    # gets a fresh pool on a fresh event loop.
    await engine.dispose()
