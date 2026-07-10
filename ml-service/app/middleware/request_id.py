# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/middleware/request_id.py
# Injects a unique X-Request-ID and X-Correlation-ID into every request.
# These IDs are available on request.state and echoed back in response headers.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class RequestIdMiddleware(BaseHTTPMiddleware):
    """
    Assigns every inbound request a unique X-Request-ID.

    If the caller provides an X-Correlation-ID header, it is preserved
    and threaded through all downstream log entries, enabling distributed
    tracing across the Next.js platform → ML Sidecar boundary.

    Both IDs are echoed back as response headers so callers can correlate
    their own logs with the ML Sidecar logs.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = str(uuid.uuid4())
        correlation_id = (
            request.headers.get("X-Correlation-ID")
            or request.headers.get("X-Request-ID")
            or request_id
        )

        # Attach to request state so all downstream code can read them
        request.state.request_id = request_id
        request.state.correlation_id = correlation_id

        response: Response = await call_next(request)

        # Echo back in response headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Correlation-ID"] = correlation_id

        return response
