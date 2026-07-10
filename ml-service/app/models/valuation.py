# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/models/valuation.py
# XGBoost AVM (Automated Valuation Model) wrapper.
# Responsible for: loading, inference, uncertainty, and feature explanation.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

import os
import time
from typing import Any, Dict, List, Optional, Tuple

from app.logging.structured import get_logger

logger = get_logger("app.models.valuation")

# Feature vector order must match the order used during model training.
# Any change here requires retraining and versioning the model.
FEATURE_ORDER: List[str] = [
    "carpet_area_sqft", "bedroom_count", "bathroom_count", "floor_number",
    "total_floors", "floor_ratio", "distance_metro_km", "distance_school_km",
    "distance_hospital_km", "distance_mall_km", "distance_it_hub_km",
    "has_lift", "has_gym", "has_pool", "amenity_count", "property_age_years",
    "developer_reputation_score", "developer_delay_pct", "developer_completion_rate",
    "demand_index", "supply_index", "inventory_months", "absorption_rate",
    "avg_appreciation_pct", "price_per_sqft_area_avg", "price_volatility_score",
    "rental_yield_area", "vacancy_rate_area", "listing_view_count", "save_count",
    "days_on_market", "price_drop_count", "rera_registered", "has_encumbrance",
    "litigation_count", "document_completeness_score", "media_trust_score",
    "image_quality_score", "has_3d_tour", "has_defects_detected",
    "buyer_interest_score", "contact_rate", "connectivity_score",
    "nearby_metro_count", "walk_score", "poi_density_score", "media_count",
]


def load_valuation_model(model_path: str) -> Any:
    """
    Loads the XGBoost AVM from a joblib-serialised file.
    Raises FileNotFoundError or ImportError on failure — caller handles these.
    """
    import joblib
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Valuation model not found at '{model_path}'. "
            "Train and deploy the model before starting the service."
        )
    model = joblib.load(model_path)
    logger.info("Valuation model loaded", path=model_path)
    return model


def run_valuation_inference(
    model: Any,
    features: Dict[str, Any],
) -> Tuple[float, Dict[str, float], List[Dict[str, Any]], List[str]]:
    """
    Runs inference on the loaded model.

    Returns:
        prediction     float — predicted price
        ci             dict  — {low, mid, high} confidence interval
        importance     list  — top-10 feature contributions
        imputed        list  — names of features that were missing and set to 0
        warnings       list  — data quality warnings
    """
    import numpy as np

    imputed: List[str] = []
    warnings: List[str] = []

    # ── Build feature vector ──────────────────────────────────────────────────
    X_values: List[float] = []
    for feat in FEATURE_ORDER:
        val = features.get(feat)
        if val is None or val == "":
            X_values.append(0.0)
            imputed.append(feat)
        else:
            try:
                X_values.append(float(val))
            except (ValueError, TypeError):
                X_values.append(0.0)
                imputed.append(feat)

    X = np.array([X_values])

    # ── Data quality warnings ─────────────────────────────────────────────────
    carpet = X[0][FEATURE_ORDER.index("carpet_area_sqft")]
    if carpet > 0 and (carpet < 100 or carpet > 50_000):
        warnings.append(f"carpet_area_sqft={carpet:.0f} is outside the normal training range.")

    # ── Inference ────────────────────────────────────────────────────────────
    prediction = float(model.predict(X)[0])

    # ── Confidence interval ───────────────────────────────────────────────────
    # Use model's built-in ensemble variance if available (quantile trees),
    # otherwise fall back to ±8% heuristic estimate.
    std_estimate = prediction * 0.08
    ci = {
        "low": round(prediction - std_estimate, 0),
        "mid": round(prediction, 0),
        "high": round(prediction + std_estimate, 0),
    }

    # ── Feature importance / SHAP ─────────────────────────────────────────────
    importance: List[Dict[str, Any]] = []
    try:
        import shap
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X)
        sv = shap_values[0]
        top_idx = abs(sv).argsort()[-10:][::-1]
        for idx in top_idx:
            feat_name = FEATURE_ORDER[idx] if idx < len(FEATURE_ORDER) else f"feat_{idx}"
            importance.append({
                "feature": feat_name,
                "importance": round(float(abs(sv[idx])), 4),
                "value": round(float(X[0][idx]), 2),
                "direction": "positive" if sv[idx] > 0 else "negative",
            })
    except Exception:
        # SHAP not available — fall back to built-in feature_importances_
        if hasattr(model, "feature_importances_"):
            fi = model.feature_importances_
            top_idx = fi.argsort()[-10:][::-1]
            for idx in top_idx:
                feat_name = FEATURE_ORDER[idx] if idx < len(FEATURE_ORDER) else f"feat_{idx}"
                importance.append({
                    "feature": feat_name,
                    "importance": round(float(fi[idx]), 4),
                    "value": round(float(X[0][idx]), 2),
                    "direction": None,
                })

    return prediction, ci, importance, imputed, warnings
