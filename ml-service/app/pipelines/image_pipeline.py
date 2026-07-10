# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/pipelines/image_pipeline.py
# 8-stage image analysis pipeline.
#
# Stages:
#   1. URL heuristic analysis (always available, fast)
#   2. Image download + validation (SSRF-safe)
#   3. CLIP inference — room classification
#   4. CLIP inference — AI detection
#   5. CLIP inference — defect detection
#   6. Score normalization and post-processing
#   7. Response assembly
#   8. Memory cleanup
#
# Graceful degradation:
#   CLIP stages (3-5) are skipped if the model is not READY.
#   Heuristic scores are used as fallback.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional

from app.logging.structured import get_logger
from app.metrics.prometheus import IMAGE_INFERENCE_LATENCY, IMAGE_REQUESTS_TOTAL
from app.registry.model_registry import get_registry
from app.schemas.requests import ImageAnalysisRequest
from app.schemas.responses import DefectDetail, ImageAnalysisResponse

logger = get_logger("app.pipelines.image")

# URL pattern heuristics
_AI_URL_PATTERNS = ["midjourney", "dalle", "stable-diffusion", "civitai", "getimg", "leonardo"]
_STOCK_URL_PATTERNS = ["shutterstock", "getty", "istockphoto", "unsplash", "pexels", "depositphotos"]
_BLURRY_URL_PATTERNS = ["thumb", "small", "xs_", "_xs", "tiny", "_sm", "thumbnail"]
_VIRTUAL_STAGED_PATTERNS = ["virtual", "staged", "render", "3d-render", "staging"]


async def run_image_pipeline(
    req: ImageAnalysisRequest,
    request_id: str,
) -> ImageAnalysisResponse:
    """
    Orchestrates the full image analysis pipeline.
    Returns ImageAnalysisResponse regardless of which stages succeed.
    """
    start = time.perf_counter()
    registry = get_registry()

    # ── Stage 1: URL heuristic analysis ──────────────────────────────────────
    url_lower = req.url.lower()
    is_ai_generated = any(p in url_lower for p in _AI_URL_PATTERNS)
    is_stock = any(p in url_lower for p in _STOCK_URL_PATTERNS)
    is_blurry = any(p in url_lower for p in _BLURRY_URL_PATTERNS)
    is_virtual_staged = any(p in url_lower for p in _VIRTUAL_STAGED_PATTERNS)

    manipulation_score = 0.0
    if is_ai_generated:
        manipulation_score = 85.0
    elif is_stock:
        manipulation_score = 65.0

    quality_score = 75.0
    if is_blurry:
        quality_score -= 30
    if is_ai_generated:
        quality_score -= 20
    if is_stock:
        quality_score -= 15

    # ── Stage 2: Image download + validation ──────────────────────────────────
    # Attempt download — if it fails, we fall back to heuristic-only results
    image = None
    download_failed = False
    try:
        from app.utils.image_utils import download_and_validate_image
        import asyncio
        loop = asyncio.get_event_loop()
        image = await loop.run_in_executor(None, download_and_validate_image, req.url)
    except Exception as exc:
        logger.warning(
            "Image download failed — using heuristic-only analysis",
            url=req.url,
            error=str(exc),
            request_id=request_id,
        )
        download_failed = True

    # ── Stages 3–5: CLIP inference ────────────────────────────────────────────
    room_type: Optional[str] = None
    defects_detected: List[DefectDetail] = []
    has_defects = False
    has_lighting_issues = False
    model_used = "heuristic_v1"

    clip_artifact = registry.get_artifact("clip")
    if clip_artifact and image is not None:
        try:
            from app.models.clip import run_clip_classification
            clip_start = time.perf_counter()
            (
                room_type,
                clip_ai_generated,
                ai_prob,
                raw_defects,
                has_lighting_issues,
            ) = run_clip_classification(clip_artifact, image)

            clip_latency = (time.perf_counter() - clip_start) * 1000
            registry.record_inference("clip", clip_latency)
            IMAGE_INFERENCE_LATENCY.labels(model="clip").observe(clip_latency / 1000)

            # CLIP overrides heuristics if confident
            if clip_ai_generated:
                is_ai_generated = True
                manipulation_score = max(manipulation_score, ai_prob * 100)

            has_defects = bool(raw_defects)
            defects_detected = [
                DefectDetail(
                    type=d["type"],
                    confidence=d["confidence"],
                    description=d["description"],
                )
                for d in raw_defects
            ]
            model_used = "clip-vit-base-patch32"

        except Exception as exc:
            logger.warning(
                "CLIP inference failed — falling back to heuristics",
                url=req.url,
                error=str(exc),
                request_id=request_id,
            )
            registry.record_error("clip")

    # Adjust quality score for defects
    if has_defects:
        quality_score -= 15
    if has_lighting_issues:
        quality_score -= 10

    # ── Stage 6: Score normalization ──────────────────────────────────────────
    quality_score = round(max(0.0, min(100.0, quality_score)), 1)
    manipulation_score = round(max(0.0, min(100.0, manipulation_score)), 1)
    trust_score = round(
        max(0.0, 100.0 - manipulation_score - (20.0 if is_blurry else 0.0) - (10.0 if has_defects else 0.0)),
        1,
    )

    # ── Stage 7: Response assembly ────────────────────────────────────────────
    processing_ms = int((time.perf_counter() - start) * 1000)

    IMAGE_REQUESTS_TOTAL.labels(
        model=model_used,
        status="success",
    ).inc()

    logger.info(
        "image_pipeline_complete",
        url=req.url,
        model_used=model_used,
        room_type=room_type,
        is_ai_generated=is_ai_generated,
        trust_score=trust_score,
        processing_ms=processing_ms,
        request_id=request_id,
    )

    # ── Stage 8: Memory cleanup ───────────────────────────────────────────────
    if image is not None:
        image.close()
        del image

    return ImageAnalysisResponse(
        url=req.url,
        isAiGenerated=is_ai_generated,
        isManipulated=manipulation_score > 50,
        manipulationScore=manipulation_score,
        isBlurry=is_blurry,
        hasLightingIssues=has_lighting_issues,
        hasDefects=has_defects,
        defectsDetected=defects_detected,
        qualityScore=quality_score,
        trustScore=trust_score,
        roomType=room_type,
        estimatedSqft=None,
        isVirtualStaged=is_virtual_staged,
        modelUsed=model_used,
        processingMs=processing_ms,
        requestId=request_id,
    )
