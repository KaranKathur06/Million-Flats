# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/api/v1/image.py
# POST /v1/analyze/image
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from app.auth.bearer import verify_auth
from app.pipelines.image_pipeline import run_image_pipeline
from app.schemas.requests import ImageAnalysisRequest
from app.schemas.responses import ImageAnalysisResponse

router = APIRouter(tags=["Image Analysis"])


@router.post(
    "/analyze/image",
    response_model=ImageAnalysisResponse,
    summary="Analyze property image quality, authenticity, and defects",
    description=(
        "Runs the 8-stage image analysis pipeline: URL validation → download → "
        "CLIP room classification → AI detection → defect detection → scoring. "
        "Degrades gracefully to heuristic analysis if CLIP is unavailable."
    ),
)
async def analyze_image(
    req: ImageAnalysisRequest,
    request: Request,
    _: str = Depends(verify_auth),
) -> ImageAnalysisResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    return await run_image_pipeline(req, request_id=request_id)
