# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/pipelines/valuation_pipeline.py
# 8-stage AVM valuation pipeline.
#
# Stages:
#   1. Input validation and range checks
#   2. Feature engineering (derived features)
#   3. Feature vector assembly
#   4. Model inference (XGBoost)
#   5. Uncertainty quantification
#   6. Explainability (SHAP → feature_importances_ fallback)
#   7. Audit record
#   8. Response assembly with full Explainability block
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

import asyncio
import time
from datetime import datetime, timezone
from typing import Any, Dict

from app.core.exceptions import ModelNotReadyError, ModelInferenceError
from app.logging.structured import get_logger
from app.metrics.prometheus import VALUATION_INFERENCE_LATENCY, VALUATION_REQUESTS_TOTAL
from app.registry.model_registry import get_registry
from app.schemas.requests import ValuationRequest
from app.schemas.responses import (
    ConfidenceInterval,
    Explainability,
    FeatureContribution,
    InputValidationSummary,
    ValuationResponse,
)
from app.utils.feature_utils import build_confidence_band, derive_floor_ratio

logger = get_logger("app.pipelines.valuation")


async def run_valuation_pipeline(
    req: ValuationRequest,
    request_id: str,
) -> ValuationResponse:
    """
    Orchestrates the full valuation pipeline.
    Returns a ValuationResponse with full explainability.
    Raises ModelNotReadyError if the model is not available.
    """
    start = time.perf_counter()
    registry = get_registry()

    # ── Stage 1: Model readiness check ───────────────────────────────────────
    if not registry.is_ready("valuation"):
        raise ModelNotReadyError(
            "Valuation model is not ready. "
            "It may still be loading or may have failed. Check /v1/health for status."
        )

    model = registry.get_artifact("valuation")

    # ── Stage 2: Feature engineering ─────────────────────────────────────────
    features = dict(req.features)

    # Derive floor_ratio if not provided
    if "floor_ratio" not in features or not features["floor_ratio"]:
        floor_num = float(features.get("floor_number", 0) or 0)
        total_floors = float(features.get("total_floors", 1) or 1)
        features["floor_ratio"] = derive_floor_ratio(floor_num, total_floors)

    # Derive amenity_count if not provided
    if "amenity_count" not in features or not features["amenity_count"]:
        amenities = ["has_lift", "has_gym", "has_pool", "has_3d_tour"]
        features["amenity_count"] = sum(1 for a in amenities if features.get(a))

    # ── Stage 3–6: Inference (offloaded to thread pool) ───────────────────────
    loop = asyncio.get_event_loop()
    try:
        result = await loop.run_in_executor(
            None, _run_inference_sync, model, features
        )
    except Exception as exc:
        registry.record_error("valuation")
        VALUATION_REQUESTS_TOTAL.labels(status="error").inc()
        logger.error(
            "valuation_inference_failed",
            entity_id=req.entityId,
            error=str(exc),
            request_id=request_id,
        )
        raise ModelInferenceError(f"Valuation inference failed: {exc}") from exc

    prediction, ci_raw, importance, imputed, warnings = result
    inference_ms = round((time.perf_counter() - start) * 1000, 1)

    # ── Record metrics ────────────────────────────────────────────────────────
    registry.record_inference("valuation", inference_ms)
    VALUATION_INFERENCE_LATENCY.observe(inference_ms / 1000)
    VALUATION_REQUESTS_TOTAL.labels(status="success").inc()

    # ── Stage 7: Audit record ─────────────────────────────────────────────────
    logger.info(
        "valuation_complete",
        entity_id=req.entityId,
        entity_type=req.entityType,
        predicted_price=prediction,
        features_provided=len(req.features),
        features_imputed=len(imputed),
        model_version="avm_xgboost_v1",
        processing_ms=inference_ms,
        request_id=request_id,
        audit=True,
    )

    # ── Stage 8: Response assembly ────────────────────────────────────────────
    confidence = max(0.0, min(1.0, 1.0 - (len(imputed) / 47) - (0.05 if warnings else 0.0)))

    return ValuationResponse(
        entityId=req.entityId,
        predictedPrice=prediction,
        confidenceInterval=ConfidenceInterval(
            low=ci_raw["low"],
            mid=ci_raw["mid"],
            high=ci_raw["high"],
        ),
        featureImportance=[
            FeatureContribution(
                feature=f["feature"],
                importance=f["importance"],
                value=f.get("value"),
                direction=f.get("direction"),
            )
            for f in importance
        ],
        modelVersion="avm_xgboost_v1",
        processingMs=int(inference_ms),
        explainability=Explainability(
            confidence=round(confidence, 3),
            confidence_band=build_confidence_band(confidence),
            feature_contributions=[
                FeatureContribution(
                    feature=f["feature"],
                    importance=f["importance"],
                    value=f.get("value"),
                    direction=f.get("direction"),
                )
                for f in importance
            ],
            model_version="avm_xgboost_v1",
            prediction_timestamp=datetime.now(timezone.utc).isoformat(),
            input_validation=InputValidationSummary(
                features_provided=len(req.features),
                features_imputed=len(imputed),
                imputed_features=imputed,
                warnings=warnings,
            ),
        ),
        requestId=request_id,
    )


def _run_inference_sync(model: Any, features: Dict[str, Any]):
    """Synchronous inference — runs in a thread pool executor."""
    from app.models.valuation import run_valuation_inference
    return run_valuation_inference(model, features)
