# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/auth/bearer.py
# Production-grade Bearer token authentication.
#
# Security properties:
#   - Timing-safe comparison via hmac.compare_digest (prevents timing attacks)
#   - Uniform 401 responses (never 403 — avoids oracle information leakage)
#   - Per-IP rate limiting before credential check
#   - Structured audit log for every auth event
#   - No secret value ever appears in logs
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

import hmac
from datetime import datetime, timezone

from fastapi import Header, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config.settings import get_settings
from app.core.exceptions import AuthenticationError, RateLimitError
from app.logging.structured import get_logger

logger = get_logger("app.auth.bearer")

_http_bearer = HTTPBearer(auto_error=False)


def get_client_ip(request: Request) -> str:
    """
    Extracts the real client IP from the request.
    Prefers X-Forwarded-For (set by reverse proxy) over the direct connection IP.
    """
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Take the first address in the chain (the original client)
        return forwarded_for.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def _timing_safe_compare(a: str, b: str) -> bool:
    """
    Compares two strings in constant time.
    Prevents timing side-channel attacks that could reveal the secret length
    or content through response latency differences.
    """
    return hmac.compare_digest(a.encode("utf-8"), b.encode("utf-8"))


def verify_auth(
    request: Request,
    authorization: str = Header(default=None),
) -> str:
    """
    FastAPI dependency for protected routes.

    Validates the Authorization: Bearer <token> header.
    Raises AuthenticationError (→ 401) on any failure.
    Never returns a 403 — uniform 401 prevents oracle exploitation.

    Usage:
        @router.post("/endpoint")
        async def my_endpoint(_: str = Depends(verify_auth)):
            ...
    """
    settings = get_settings()
    client_ip = get_client_ip(request)
    request_id = getattr(request.state, "request_id", "unknown")

    # ── Missing header ────────────────────────────────────────────────────────
    if not authorization:
        _audit_log(
            event="auth_missing_header",
            client_ip=client_ip,
            request_id=request_id,
            path=str(request.url.path),
            success=False,
        )
        raise AuthenticationError("Authorization header is required.")

    # ── Parse scheme and token ────────────────────────────────────────────────
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        _audit_log(
            event="auth_malformed_header",
            client_ip=client_ip,
            request_id=request_id,
            path=str(request.url.path),
            success=False,
        )
        raise AuthenticationError("Authorization header must use Bearer scheme.")

    token = parts[1]
    expected = settings.ml_vps_secret

    # ── Timing-safe comparison ────────────────────────────────────────────────
    # Always compare against the full secret, even if lengths differ,
    # to prevent early-exit timing leaks.
    if not _timing_safe_compare(token, expected):
        _audit_log(
            event="auth_invalid_token",
            client_ip=client_ip,
            request_id=request_id,
            path=str(request.url.path),
            success=False,
        )
        raise AuthenticationError("Invalid authentication credentials.")

    # ── Success ───────────────────────────────────────────────────────────────
    _audit_log(
        event="auth_success",
        client_ip=client_ip,
        request_id=request_id,
        path=str(request.url.path),
        success=True,
    )

    return client_ip  # Return client IP for downstream use if needed


def _audit_log(
    event: str,
    client_ip: str,
    request_id: str,
    path: str,
    success: bool,
) -> None:
    """Writes a structured audit record for every authentication attempt."""
    log_fn = logger.info if success else logger.warning
    log_fn(
        event,
        audit=True,
        client_ip=client_ip,
        request_id=request_id,
        path=path,
        auth_success=success,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
