# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/api/v1/models_router.py
# GET /v1/models — List all registered models with their current status.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.auth.bearer import verify_auth
from app.registry.model_registry import get_registry
from app.schemas.responses import ModelInfo, ModelsResponse

router = APIRouter(tags=["Models"])

_MODEL_TYPE_MAP = {
    "valuation": ("regression", "property_valuation"),
    "clip": ("vision_transformer", "image_analysis"),
    "sentence_transformer": ("sentence_embedding", "property_similarity_search"),
}


@router.get(
    "/models",
    response_model=ModelsResponse,
    summary="List all registered models",
    dependencies=[Depends(verify_auth)],
)
async def list_models():
    """
    Returns the full model registry with status, metrics, and version info.
    Used by the Next.js platform admin panel to monitor model health.
    """
    registry = get_registry()
    records = registry.all_records()

    models = []
    for rec in records:
        model_type, purpose = _MODEL_TYPE_MAP.get(rec.name, ("unknown", "unknown"))
        models.append(ModelInfo(
            name=rec.name,
            version=rec.version,
            type=model_type,
            purpose=purpose,
            status=rec.status.value,
            loaded_at=rec.loaded_at.isoformat() if rec.loaded_at else None,
            inference_count=rec.inference_count,
            avg_latency_ms=rec.avg_latency_ms,
            memory_mb=rec.memory_mb,
            error_rate=rec.error_rate,
        ))

    ready_count = sum(1 for m in models if m.status == "READY")

    return ModelsResponse(models=models, total=len(models), ready_count=ready_count)
