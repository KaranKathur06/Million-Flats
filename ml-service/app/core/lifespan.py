# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/core/lifespan.py
# FastAPI lifespan context manager.
# Controls the full startup and shutdown sequence.
# Models are loaded BEFORE the server starts serving requests.
# A failed critical model aborts startup entirely.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI

from app.config.settings import get_settings
from app.logging.structured import configure_logging, get_logger

logger = get_logger("app.core.lifespan")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    FastAPI lifespan handler.

    STARTUP order:
        1. Configure structured logging
        2. Validate configuration (already done at import — fails fast)
        3. Load CRITICAL models synchronously (fail startup on error)
        4. Load OPTIONAL models in background (degraded if they fail)
        5. Start background workers
        6. Schedule warm-up inference requests

    SHUTDOWN order:
        1. Signal background workers to stop
        2. Unload all models
        3. Flush logs
    """
    settings = get_settings()

    # Step 1: Configure logging for the entire application
    configure_logging(
        level=settings.log_level,
        log_format=settings.log_format,
        service_name=settings.service_name,
        environment=settings.environment,
    )

    logger.info(
        "MillionFlats ML Sidecar starting up",
        version=settings.service_version,
        environment=settings.environment,
        workers=settings.workers,
    )

    # Deferred imports to avoid circular dependencies at module load time
    from app.models.manager import ModelManager
    from app.workers.background import BackgroundWorkerManager

    model_manager = ModelManager()
    worker_manager = BackgroundWorkerManager()

    # Step 2: Store manager on app state so routes can access it
    app.state.model_manager = model_manager
    app.state.worker_manager = worker_manager

    # Step 3: Load critical models synchronously
    # If any critical model fails, the startup raises and the process exits.
    # systemd / Docker will then restart the service.
    logger.info("Loading critical models...", models=settings.critical_model_names)
    try:
        await model_manager.load_critical_models(settings.critical_model_names)
        logger.info("✅ All critical models loaded")
    except Exception as exc:
        logger.critical(
            "CRITICAL model load failed — aborting startup",
            error=str(exc),
            models=settings.critical_model_names,
        )
        raise SystemExit(1) from exc

    # Step 4: Load optional models in background (non-blocking)
    logger.info("Scheduling optional model loading...", models=settings.optional_model_names)
    asyncio.create_task(
        model_manager.load_optional_models(settings.optional_model_names),
        name="optional-model-loader",
    )

    # Step 5: Start background workers
    await worker_manager.start()

    # Step 6: Warm-up (non-blocking — fire and forget)
    asyncio.create_task(model_manager.run_warmup(), name="model-warmup")

    logger.info(
        "✅ Startup complete — serving requests",
        version=settings.service_version,
        host=settings.host,
        port=settings.port,
    )

    # ── Hand control back to FastAPI ──────────────────────────────────────────
    yield
    # ── Shutdown begins here ──────────────────────────────────────────────────

    logger.info("ML Sidecar shutting down gracefully...")

    await worker_manager.stop()
    await model_manager.unload_all()

    logger.info("✅ Shutdown complete")
