# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/schemas/errors.py
# Standardized error response schema.
# All API errors return this structure — never raw exception strings.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel


class ErrorCode(str, Enum):
    # Auth
    AUTH_FAILED = "AUTH_FAILED"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"

    # Validation
    VALIDATION_ERROR = "VALIDATION_ERROR"

    # Models
    MODEL_NOT_READY = "MODEL_NOT_READY"
    INFERENCE_FAILED = "INFERENCE_FAILED"

    # Pipelines
    PIPELINE_ERROR = "PIPELINE_ERROR"
    IMAGE_DOWNLOAD_FAILED = "IMAGE_DOWNLOAD_FAILED"
    IMAGE_INVALID = "IMAGE_INVALID"

    # System
    INTERNAL_ERROR = "INTERNAL_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"


class ErrorDetail(BaseModel):
    errorCode: ErrorCode
    message: str
    requestId: str
    timestamp: str
    path: Optional[str] = None


class ErrorResponse(BaseModel):
    error: ErrorDetail

    model_config = {"json_schema_extra": {
        "example": {
            "error": {
                "errorCode": "AUTH_FAILED",
                "message": "Invalid authentication credentials.",
                "requestId": "550e8400-e29b-41d4-a716-446655440000",
                "timestamp": "2026-07-08T10:00:00Z",
                "path": "/v1/predict/valuation",
            }
        }
    }}
