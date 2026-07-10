# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/api/v1/health.py
# Health and diagnostics endpoints.
# GET /v1/health       — Full diagnostic (no auth required for monitoring)
# GET /v1/health/models — Model registry dump (auth required)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from app.auth.bearer import verify_auth
from app.health.checker import SystemHealthChecker, ServiceStatus, increment_request_count
from app.registry.model_registry import get_registry

router = APIRouter(tags=["Health"])
_checker = SystemHealthChecker()


@router.get(
    "/health",
    summary="Enterprise health diagnostics",
    description=(
        "Returns a comprehensive health report including system metrics, "
        "model status, runtime versions, and dependency states. "
        "Status codes: READY | DEGRADED | NOT_READY | FAILED."
    ),
)
async def health_check(request: Request):
    increment_request_count()
    health = _checker.build_health_response()
    status_code = 200 if health["status"] in (ServiceStatus.READY, ServiceStatus.DEGRADED) else 503
    return JSONResponse(content=health, status_code=status_code)


@router.get(
    "/health/models",
    summary="Model registry snapshot",
    dependencies=[Depends(verify_auth)],
)
async def health_models():
    """Returns the full model registry with all metadata and runtime metrics."""
    registry = get_registry()
    return {
        "models": registry.snapshot(),
        "total": len(registry.all_records()),
        "ready": sum(1 for r in registry.all_records() if r.is_ready),
    }
