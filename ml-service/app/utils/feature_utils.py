# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/utils/feature_utils.py
# Feature engineering utilities shared across pipelines.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations


def build_confidence_band(confidence: float) -> str:
    """
    Converts a numeric confidence score [0–1] to a human-readable band.

    Thresholds:
        HIGH   ≥ 0.80
        MEDIUM ≥ 0.60
        LOW    < 0.60
    """
    if confidence >= 0.80:
        return "HIGH"
    elif confidence >= 0.60:
        return "MEDIUM"
    return "LOW"


def safe_float(value, default: float = 0.0) -> float:
    """Safely converts any value to float, returning default on failure."""
    if value is None or value == "":
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def derive_floor_ratio(floor_number: float, total_floors: float) -> float:
    """Derives floor_ratio = floor_number / total_floors, safe against division by zero."""
    if total_floors <= 0:
        return 0.0
    return round(floor_number / total_floors, 4)
