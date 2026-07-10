# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/pipelines/embedding_pipeline.py
# Multi-entity embedding pipeline.
# Converts structured feature dicts into semantic embedding vectors.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

import asyncio
import time

from app.core.exceptions import ModelNotReadyError, ModelInferenceError
from app.logging.structured import get_logger
from app.metrics.prometheus import EMBEDDING_INFERENCE_LATENCY, EMBEDDING_REQUESTS_TOTAL
from app.models.embedding import EMBEDDING_DIMENSIONS, build_embedding_text, run_embedding_inference
from app.registry.model_registry import get_registry
from app.schemas.requests import EmbeddingRequest
from app.schemas.responses import EmbeddingResponse

logger = get_logger("app.pipelines.embedding")


async def run_embedding_pipeline(
    req: EmbeddingRequest,
    request_id: str,
) -> EmbeddingResponse:
    """
    Converts structured entity features into a normalized embedding vector.

    Supports entity types: property, developer, project, neighborhood,
    document, image, conversation.
    """
    start = time.perf_counter()
    registry = get_registry()

    # ── Model readiness check ─────────────────────────────────────────────────
    if not registry.is_ready("sentence_transformer"):
        raise ModelNotReadyError(
            "Embedding model is not ready. Check /v1/health for model status."
        )

    model = registry.get_artifact("sentence_transformer")

    # ── Build text representation ─────────────────────────────────────────────
    text = build_embedding_text(req.entityType, req.features)

    if not text.strip():
        raise ModelInferenceError(
            "Could not build a meaningful text description from the provided features. "
            "Ensure the features dict contains meaningful values."
        )

    # ── Run inference ─────────────────────────────────────────────────────────
    loop = asyncio.get_event_loop()
    try:
        embedding = await loop.run_in_executor(
            None, run_embedding_inference, model, text
        )
    except Exception as exc:
        registry.record_error("sentence_transformer")
        EMBEDDING_REQUESTS_TOTAL.labels(status="error").inc()
        logger.error(
            "embedding_inference_failed",
            entity_id=req.entityId,
            entity_type=req.entityType,
            error=str(exc),
            request_id=request_id,
        )
        raise ModelInferenceError(f"Embedding inference failed: {exc}") from exc

    inference_ms = round((time.perf_counter() - start) * 1000, 1)

    # ── Record metrics ────────────────────────────────────────────────────────
    registry.record_inference("sentence_transformer", inference_ms)
    EMBEDDING_INFERENCE_LATENCY.observe(inference_ms / 1000)
    EMBEDDING_REQUESTS_TOTAL.labels(status="success").inc()

    logger.info(
        "embedding_complete",
        entity_id=req.entityId,
        entity_type=req.entityType,
        text_length=len(text),
        dimensions=len(embedding),
        processing_ms=inference_ms,
        request_id=request_id,
    )

    return EmbeddingResponse(
        entityId=req.entityId,
        entityType=req.entityType,
        embedding=embedding,
        dimensions=len(embedding),
        modelVersion="all-MiniLM-L6-v2",
        processingMs=int(inference_ms),
        requestId=request_id,
    )
