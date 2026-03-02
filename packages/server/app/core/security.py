"""Admin API key dependency for protected endpoints."""

import hmac

from fastapi import Depends, HTTPException, Header

from app.core.config import settings


async def verify_admin_key(
    x_admin_key: str | None = Header(None),
) -> None:
    """Validate the X-Admin-Key header against the configured admin API key.

    Raises 401 if the key is missing or incorrect.
    Raises 403 if no admin key is configured on the server (prevents
    accidental open access if the env var is forgotten).

    Uses hmac.compare_digest for timing-safe comparison to prevent
    side-channel attacks that could leak the key via response timing.
    """
    if not settings.admin_api_key:
        raise HTTPException(
            status_code=403,
            detail="Admin operations are disabled (no ADMIN_API_KEY configured)",
        )
    if not x_admin_key or not hmac.compare_digest(x_admin_key, settings.admin_api_key):
        raise HTTPException(status_code=401, detail="Invalid or missing admin key")
