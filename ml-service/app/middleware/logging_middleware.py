# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/middleware/logging_middleware.py
# Structured request/response logging middleware.
# Logs every request as a single JSON line after it completes.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.logging.structured import get_logger

logger = get_logger("app.access")

# Paths that should not be logged (avoid flooding logs with health polls)
_SILENT_PATHS = {"/health", "/v1/health", "/metrics", "/"}


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Logs a structured JSON access record after every request completes.

    Fields:
        event          "request_completed"
        method         HTTP method
        path           URL path (no query params for PII safety)
        status_code    HTTP response status
        duration_ms    Total request processing time
        request_id     From request.state (set by RequestIdMiddleware)
        correlation_id From request.state
        client_ip      Real client IP (via X-Forwarded-For if present)
        user_agent     Truncated User-Agent header
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip noisy health-check paths to keep log volume manageable
        if request.url.path in _SILENT_PATHS:
            return await call_next(request)

        start = time.perf_counter()

        try:
            response: Response = await call_next(request)
        except Exception:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            _log_request(request, 500, duration_ms)
            raise

        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        _log_request(request, response.status_code, duration_ms)

        return response


def _log_request(request: Request, status_code: int, duration_ms: float) -> None:
    client_ip = "unknown"
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    elif request.client:
        client_ip = request.client.host

    # Truncate user agent to avoid log bloat
    user_agent = (request.headers.get("User-Agent") or "")[:120]

    log_level = "warning" if status_code >= 400 else "info"
    getattr(logger, log_level)(
        "request_completed",
        method=request.method,
        path=request.url.path,
        status_code=status_code,
        duration_ms=duration_ms,
        request_id=getattr(request.state, "request_id", "unknown"),
        correlation_id=getattr(request.state, "correlation_id", "unknown"),
        client_ip=client_ip,
        user_agent=user_agent,
    )
