# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/main.py
# Application factory — the ONLY place where FastAPI is instantiated.
#
# Responsibilities:
#   - Create the FastAPI app with lifespan
#   - Register middleware (order matters: outermost = first)
#   - Mount routers
#   - Register exception handlers
#   - Mount Prometheus metrics endpoint
#
# Contains NO business logic. Everything is delegated.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import v1_router
from app.config.settings import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.lifespan import lifespan
from app.metrics.prometheus import setup_metrics
from app.middleware.logging_middleware import RequestLoggingMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.request_id import RequestIdMiddleware


def create_app() -> FastAPI:
    """
    Application factory. Returns a fully configured FastAPI instance.
    Import and call this from the root main.py entrypoint.
    """
    settings = get_settings()

    app = FastAPI(
        title="MillionFlats ML Inference Platform",
        description=(
            "Enterprise-grade AI inference service for the MillionFlats real estate platform. "
            "Powers property valuation (AVM), image analysis, and semantic similarity search."
        ),
        version=settings.service_version,
        docs_url="/docs" if settings.environment != "production" else None,
        redoc_url="/redoc" if settings.environment != "production" else None,
        openapi_url="/openapi.json" if settings.environment != "production" else None,
        lifespan=lifespan,
    )

    # ── Middleware registration (outermost wraps innermost) ────────────────────
    # 1. RequestId   — injected first so all subsequent middleware can use it
    app.add_middleware(RequestIdMiddleware)

    # 2. Rate limiting — before auth to protect even the auth check
    app.add_middleware(
        RateLimitMiddleware,
        requests_per_minute=settings.rate_limit_requests_per_minute,
    )

    # 3. Structured request logging — after rate limiting
    app.add_middleware(RequestLoggingMiddleware)

    # 4. CORS — outermost so preflight requests are handled before auth
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.platform_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID", "X-Correlation-ID"],
        expose_headers=["X-Request-ID", "X-Correlation-ID"],
        allow_credentials=False,
    )

    # ── Exception handlers ────────────────────────────────────────────────────
    register_exception_handlers(app)

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(v1_router)

    # ── Prometheus metrics endpoint ───────────────────────────────────────────
    if settings.prometheus_enabled:
        setup_metrics(app, path=settings.prometheus_metrics_path)

    return app


# Module-level app instance (imported by uvicorn)
app = create_app()
