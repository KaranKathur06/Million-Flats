# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/schemas/requests.py
# All inbound request Pydantic models.
# Validation happens automatically before any route handler runs.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field, field_validator


class ImageAnalysisRequest(BaseModel):
    """Request body for POST /v1/analyze/image"""

    url: str = Field(..., description="HTTPS URL of the image to analyse.", min_length=10, max_length=2048)
    entityId: Optional[str] = Field(None, description="ID of the entity (property/project) this image belongs to.")
    entityType: Optional[str] = Field(None, description="Type of entity: 'property' | 'project' | 'developer'.")

    @field_validator("url")
    @classmethod
    def url_must_be_https(cls, v: str) -> str:
        if not v.startswith("https://"):
            raise ValueError("Image URL must use HTTPS. HTTP URLs are not permitted for security reasons.")
        return v

    model_config = {"json_schema_extra": {
        "example": {
            "url": "https://cdn.millionflats.com/properties/prop_123/image_1.jpg",
            "entityId": "prop_123",
            "entityType": "property",
        }
    }}


class ValuationRequest(BaseModel):
    """Request body for POST /v1/predict/valuation"""

    entityId: str = Field(..., description="Unique identifier of the property.", min_length=1)
    entityType: str = Field(..., description="Entity type: 'property' | 'listing'.")
    features: Dict[str, Any] = Field(
        ...,
        description="Feature dict. Missing numeric features are imputed with 0. See API docs for full feature list.",
    )

    @field_validator("features")
    @classmethod
    def features_not_empty(cls, v: Dict[str, Any]) -> Dict[str, Any]:
        if not v:
            raise ValueError("features dict must not be empty.")
        return v

    model_config = {"json_schema_extra": {
        "example": {
            "entityId": "prop_456",
            "entityType": "property",
            "features": {
                "carpet_area_sqft": 1200,
                "bedroom_count": 3,
                "bathroom_count": 2,
                "floor_number": 8,
                "total_floors": 20,
                "distance_metro_km": 0.8,
                "has_lift": 1,
                "has_gym": 1,
                "has_pool": 0,
                "rera_registered": 1,
            },
        }
    }}


class EmbeddingRequest(BaseModel):
    """Request body for POST /v1/embed/property"""

    entityId: str = Field(..., description="Unique identifier of the entity.", min_length=1)
    entityType: Literal[
        "property", "developer", "project", "neighborhood",
        "document", "image", "conversation"
    ] = Field(..., description="Entity type determines which text template is used for embedding.")
    features: Dict[str, Any] = Field(
        ...,
        description="Structured feature dict. The embedding service converts this to a rich text description.",
    )

    model_config = {"json_schema_extra": {
        "example": {
            "entityId": "prop_789",
            "entityType": "property",
            "features": {
                "propertyType": "apartment",
                "bedroomCount": 2,
                "bathroomCount": 2,
                "community": "Bandra West",
                "city": "Mumbai",
                "carpetAreaSqft": 950,
                "floorNumber": 5,
                "totalFloors": 12,
                "distanceMetroKm": 0.4,
                "reraRegistered": True,
                "furnishingStatus": "semi-furnished",
            },
        }
    }}
