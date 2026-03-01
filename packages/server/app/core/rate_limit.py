"""Simple in-memory rate limiting middleware for FastAPI.

Uses a sliding window counter per IP address. Not suitable for
multi-process deployments (use Redis-based limiting instead).
Sufficient for single-process Railway deployments.
"""

import time
from collections import defaultdict
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


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
        self._counters: dict[str, tuple[float, int]] = defaultdict(lambda: (0.0, 0))

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        now = time.monotonic()

        # Determine limit based on path
        path = request.url.path
        is_expensive = any(path.startswith(p) for p in self.expensive_paths)
        limit = self.max_requests // 4 if is_expensive else self.max_requests

        window_start, count = self._counters[client_ip]

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
