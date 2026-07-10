# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/models/manager.py
# ModelManager — the single authority for loading, unloading, reloading,
# and health-checking all ML models.
#
# Design principles:
#   - Only ModelManager mutates the ModelRegistry
#   - A failed OPTIONAL model logs a warning but never crashes the service
#   - A failed CRITICAL model raises immediately (triggers SystemExit in lifespan)
#   - All model loading is measured and recorded in the registry
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

import asyncio
import os
import time
from datetime import datetime, timezone
from typing import List

from app.config.settings import get_settings
from app.logging.structured import get_logger
from app.registry.model_registry import (
    ModelRecord,
    ModelStatus,
    _compute_file_checksum,
    get_registry,
)

logger = get_logger("app.models.manager")

# ── Model definitions ─────────────────────────────────────────────────────────
# Declares all known models with their metadata.
# Actual loading logic lives in individual model modules.

_MODEL_DEFINITIONS = {
    "valuation": ModelRecord(
        name="valuation",
        version="avm_xgboost_v1",
        source="local_file",
        description="XGBoost Automated Valuation Model for Indian residential property.",
        tags=["regression", "xgboost", "avm"],
    ),
    "clip": ModelRecord(
        name="clip",
        version="clip-vit-base-patch32",
        source="huggingface",
        description="OpenAI CLIP for zero-shot image classification and defect detection.",
        tags=["vision", "transformer", "zero-shot"],
    ),
    "sentence_transformer": ModelRecord(
        name="sentence_transformer",
        version="all-MiniLM-L6-v2",
        source="huggingface",
        description="Sentence embeddings for property semantic similarity search.",
        tags=["nlp", "embedding", "pgvector"],
    ),
}


class ModelManager:
    """
    Manages the full lifecycle of all ML models.
    Routes and pipelines access model artifacts via get_registry().get_artifact(name),
    never via this class directly.
    """

    def __init__(self) -> None:
        self._registry = get_registry()
        self._settings = get_settings()

        # Pre-register all model definitions so health endpoint can report them
        for name, record in _MODEL_DEFINITIONS.items():
            self._registry.register(record)

    # ── Public API ────────────────────────────────────────────────────────────

    async def load_critical_models(self, model_names: List[str]) -> None:
        """
        Loads critical models synchronously (in the event loop via run_in_executor).
        Raises on any failure — caller (lifespan) will abort startup.
        """
        for name in model_names:
            if name in _MODEL_DEFINITIONS:
                logger.info("Loading critical model", model=name)
                await self._load_model(name, critical=True)

    async def load_optional_models(self, model_names: List[str]) -> None:
        """
        Loads optional models in the background.
        Failures set the model to DEGRADED but do not propagate.
        """
        for name in model_names:
            if name in _MODEL_DEFINITIONS:
                try:
                    logger.info("Loading optional model", model=name)
                    await self._load_model(name, critical=False)
                except Exception as exc:
                    logger.warning(
                        "Optional model failed to load — service degraded for this model",
                        model=name,
                        error=str(exc),
                    )
                    self._registry.update_status(name, ModelStatus.DEGRADED)

    async def run_warmup(self) -> None:
        """
        Runs a synthetic warm-up inference to prime PyTorch and JIT caches.
        Errors are non-fatal.
        """
        await asyncio.sleep(2)  # Let optional models finish loading
        try:
            from app.models.embedding import run_embedding_inference
            model = self._registry.get_artifact("sentence_transformer")
            if model:
                run_embedding_inference(model, "warm-up property 2BHK Mumbai")
                logger.info("Warm-up inference complete", model="sentence_transformer")
        except Exception as exc:
            logger.warning("Warm-up inference failed", error=str(exc))

    async def unload_all(self) -> None:
        """Releases all model artifacts to free memory on shutdown."""
        for name in _MODEL_DEFINITIONS:
            self._registry.unload(name)
            logger.info("Model unloaded", model=name)

    async def reload_model(self, name: str) -> None:
        """Hot-reloads a single model without downtime."""
        if name not in _MODEL_DEFINITIONS:
            raise ValueError(f"Unknown model: {name}")
        logger.info("Hot-reloading model", model=name)
        self._registry.update_status(name, ModelStatus.LOADING)
        await self._load_model(name, critical=False)

    # ── Internal ──────────────────────────────────────────────────────────────

    async def _load_model(self, name: str, critical: bool) -> None:
        """
        Delegates to the appropriate model module and records the result
        in the registry.
        """
        loop = asyncio.get_event_loop()
        self._registry.update_status(name, ModelStatus.LOADING)

        start = time.perf_counter()
        try:
            artifact = await loop.run_in_executor(None, self._load_sync, name)
        except Exception as exc:
            self._registry.update_status(name, ModelStatus.FAILED)
            if critical:
                raise RuntimeError(f"Critical model '{name}' failed to load: {exc}") from exc
            raise

        load_ms = round((time.perf_counter() - start) * 1000, 1)
        checksum = None

        if name == "valuation":
            checksum = _compute_file_checksum(self._settings.valuation_model_path)

        self._registry.set_artifact(
            name,
            artifact,
            loaded_at=datetime.now(timezone.utc),
            load_duration_ms=load_ms,
            checksum=checksum,
        )

        logger.info(
            "Model ready",
            model=name,
            load_duration_ms=load_ms,
            status=ModelStatus.READY.value,
        )

    @staticmethod
    def _load_sync(name: str):
        """Synchronous loader — runs in a thread pool to avoid blocking the event loop."""
        settings = get_settings()

        if name == "valuation":
            from app.models.valuation import load_valuation_model
            return load_valuation_model(settings.valuation_model_path)

        elif name == "clip":
            from app.models.clip import load_clip_model
            return load_clip_model()

        elif name == "sentence_transformer":
            from app.models.embedding import load_embedding_model
            return load_embedding_model()

        else:
            raise ValueError(f"No loader defined for model: '{name}'")
