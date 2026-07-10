# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/schemas/responses.py
# All outbound response Pydantic models.
# Includes the Explainability block present on every prediction response.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ── Shared sub-models ─────────────────────────────────────────────────────────

class ConfidenceInterval(BaseModel):
    low: float
    mid: float
    high: float


class FeatureContribution(BaseModel):
    feature: str
    importance: float
    value: Optional[float] = None
    direction: Optional[str] = None  # "positive" | "negative" | "neutral"


class InputValidationSummary(BaseModel):
    features_provided: int
    features_imputed: int
    imputed_features: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class Explainability(BaseModel):
    """
    Attached to every ML prediction response.
    Provides confidence, evidence, and per-feature contribution.
    """
    confidence: float = Field(..., ge=0.0, le=1.0, description="Model confidence [0–1].")
    confidence_band: str = Field(..., description="'HIGH' | 'MEDIUM' | 'LOW'")
    feature_contributions: List[FeatureContribution] = Field(default_factory=list)
    model_version: str
    prediction_timestamp: str
    input_validation: InputValidationSummary


class DefectDetail(BaseModel):
    type: str
    confidence: float
    description: str


# ── Image Analysis ────────────────────────────────────────────────────────────

class ImageAnalysisResponse(BaseModel):
    url: str
    isAiGenerated: bool
    isManipulated: bool
    manipulationScore: float
    isBlurry: bool
    hasLightingIssues: bool
    hasDefects: bool
    defectsDetected: List[DefectDetail]
    qualityScore: float
    trustScore: float
    roomType: Optional[str]
    estimatedSqft: Optional[float]
    isVirtualStaged: bool
    modelUsed: str
    processingMs: int
    requestId: Optional[str] = None


# ── Valuation ─────────────────────────────────────────────────────────────────

class ValuationResponse(BaseModel):
    entityId: str
    predictedPrice: float
    confidenceInterval: ConfidenceInterval
    featureImportance: List[FeatureContribution]
    modelVersion: str
    processingMs: int
    explainability: Explainability
    requestId: Optional[str] = None


# ── Embedding ─────────────────────────────────────────────────────────────────

class EmbeddingResponse(BaseModel):
    entityId: str
    entityType: str
    embedding: List[float]
    dimensions: int
    modelVersion: str
    processingMs: int
    requestId: Optional[str] = None


# ── Model List ────────────────────────────────────────────────────────────────

class ModelInfo(BaseModel):
    name: str
    version: str
    type: str
    purpose: str
    status: str
    loaded_at: Optional[str] = None
    inference_count: int = 0
    avg_latency_ms: Optional[float] = None
    memory_mb: Optional[float] = None
    error_rate: float = 0.0


class ModelsResponse(BaseModel):
    models: List[ModelInfo]
    total: int
    ready_count: int
