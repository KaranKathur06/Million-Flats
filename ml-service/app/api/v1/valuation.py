# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/api/v1/valuation.py
# POST /v1/predict/valuation
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from app.auth.bearer import verify_auth
from app.pipelines.valuation_pipeline import run_valuation_pipeline
from app.schemas.requests import ValuationRequest
from app.schemas.responses import ValuationResponse

router = APIRouter(tags=["Valuation"])


@router.post(
    "/predict/valuation",
    response_model=ValuationResponse,
    summary="Predict property valuation (AVM)",
    description=(
        "Runs the 8-stage Automated Valuation Model pipeline: "
        "feature engineering → XGBoost inference → SHAP explainability → "
        "confidence scoring → audit record. "
        "Returns predicted price, confidence interval, and full feature contributions."
    ),
)
async def predict_valuation(
    req: ValuationRequest,
    request: Request,
    _: str = Depends(verify_auth),
) -> ValuationResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    return await run_valuation_pipeline(req, request_id=request_id)
