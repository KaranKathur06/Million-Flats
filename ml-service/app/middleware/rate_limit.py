# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/middleware/rate_limit.py
# In-memory sliding-window rate limiter.
# Limits requests per IP to prevent abuse without requiring Redis.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Deque, Dict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config.settings import get_settings
from app.logging.structured import get_logger

logger = get_logger("app.middleware.rate_limit")

# Paths exempt from rate limiting (health checks, metrics)
_EXEMPT_PATHS = {"/health", "/v1/health", "/metrics", "/"}


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Sliding-window rate limiter using per-IP timestamp queues.

    Algorithm:
        1. For each request, retrieve the timestamp queue for that IP.
        2. Remove timestamps older than 60 seconds.
        3. If len(queue) >= limit, reject with 429.
        4. Otherwise, append now() and allow the request.

    This provides a true sliding window (not a fixed reset bucket),
    so 60 requests spread over a minute are always allowed regardless
    of when the minute boundary falls.

    For production at scale, replace with Redis + Lua script for
    cross-process consistency (important when WORKERS > 1).
    """

    def __init__(self, app, requests_per_minute: int = 60) -> None:
        super().__init__(app)
        self._limit = requests_per_minute
        self._window = 60.0  # seconds
        self._buckets: Dict[str, Deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next) -> Response:
        # Exempt specific paths
        if request.url.path in _EXEMPT_PATHS:
            return await call_next(request)

        client_ip = self._get_ip(request)
        now = time.monotonic()

        queue = self._buckets[client_ip]

        # Evict expired timestamps
        while queue and now - queue[0] > self._window:
            queue.popleft()

        if len(queue) >= self._limit:
            retry_after = int(self._window - (now - queue[0])) + 1
            logger.warning(
                "rate_limit_exceeded",
                client_ip=client_ip,
                path=request.url.path,
                request_id=getattr(request.state, "request_id", "unknown"),
                retry_after_seconds=retry_after,
            )
            return JSONResponse(
                status_code=429,
                content={
                    "error": {
                        "errorCode": "RATE_LIMIT_EXCEEDED",
                        "message": f"Too many requests. Limit is {self._limit} per minute.",
                        "retryAfterSeconds": retry_after,
                    }
                },
                headers={"Retry-After": str(retry_after)},
            )

        queue.append(now)
        return await call_next(request)

    @staticmethod
    def _get_ip(request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
