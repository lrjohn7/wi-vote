"""Simple in-memory rate limiting middleware for FastAPI.

Uses a fixed-window counter per IP address. Not suitable for
multi-process deployments (use Redis-based limiting instead).
Sufficient for single-process Railway deployments.
"""

import time
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# Maximum unique IPs to track before evicting stale entries
_MAX_COUNTER_ENTRIES = 10_000


def _get_client_ip(request: Request) -> str:
    """Extract the real client IP, respecting proxy headers.

    Priority: X-Forwarded-For (first IP) > X-Real-IP > request.client.host
    """
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        # X-Forwarded-For may contain: "client, proxy1, proxy2"
        return forwarded_for.split(",")[0].strip()

    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()

    return request.client.host if request.client else "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiter using a fixed-window counter per client IP.

    Args:
        app: The ASGI application.
        max_requests: Maximum requests per window.
        window_seconds: Window duration in seconds.
        expensive_paths: Paths that get a stricter limit (max_requests / 4).
    """

    def __init__(
        self,
        app: Callable,
        max_requests: int = 120,
        window_seconds: int = 60,
        expensive_paths: list[str] | None = None,
    ) -> None:
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.expensive_paths = expensive_paths or []
        # ip -> (window_start, count)
        self._counters: dict[str, tuple[float, int]] = {}
        self._last_cleanup = time.monotonic()

    def _cleanup_stale_entries(self, now: float) -> None:
        """Remove expired counter entries to prevent unbounded memory growth."""
        if len(self._counters) < _MAX_COUNTER_ENTRIES:
            return
        stale_keys = [
            ip for ip, (window_start, _) in self._counters.items()
            if now - window_start >= self.window_seconds
        ]
        for key in stale_keys:
            del self._counters[key]

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_ip = _get_client_ip(request)
        now = time.monotonic()

        # Periodic cleanup to prevent memory leak
        if now - self._last_cleanup > self.window_seconds * 2:
            self._cleanup_stale_entries(now)
            self._last_cleanup = now

        # Determine limit based on path
        path = request.url.path
        is_expensive = any(path.startswith(p) for p in self.expensive_paths)
        limit = self.max_requests // 4 if is_expensive else self.max_requests

        window_start, count = self._counters.get(client_ip, (0.0, 0))

        # Reset window if expired
        if now - window_start >= self.window_seconds:
            window_start = now
            count = 0

        count += 1
        self._counters[client_ip] = (window_start, count)

        if count > limit:
            return Response(
                content='{"detail":"Rate limit exceeded. Try again later."}',
                status_code=429,
                media_type="application/json",
                headers={
                    "Retry-After": str(int(self.window_seconds - (now - window_start))),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, limit - count))
        return response
