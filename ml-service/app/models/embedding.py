# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/models/embedding.py
# SentenceTransformer embedding model wrapper.
# Supports multiple entity types with dedicated text templates for each.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

from typing import Any, Dict, List

from app.logging.structured import get_logger

logger = get_logger("app.models.embedding")

MODEL_ID = "all-MiniLM-L6-v2"
EMBEDDING_DIMENSIONS = 384


def load_embedding_model() -> Any:
    """Loads the SentenceTransformer model."""
    from sentence_transformers import SentenceTransformer

    logger.info("Loading SentenceTransformer model", model_id=MODEL_ID)
    model = SentenceTransformer(MODEL_ID)
    logger.info("SentenceTransformer model loaded", model_id=MODEL_ID)
    return model


def build_embedding_text(entity_type: str, features: Dict[str, Any]) -> str:
    """
    Converts a structured feature dict into a rich text description
    suitable for semantic embedding.

    Each entity type has a dedicated template that maximises the semantic
    information density of the resulting embedding vector.
    """
    f = features

    if entity_type == "property":
        return (
            f"{f.get('propertyType', 'property')} "
            f"{f.get('bedroomCount', '')}BR {f.get('bathroomCount', '')}BA "
            f"in {f.get('community', '')} {f.get('city', '')} "
            f"{f.get('carpetAreaSqft', '')} sqft "
            f"floor {f.get('floorNumber', '')} of {f.get('totalFloors', '')} "
            f"metro {f.get('distanceMetroKm', '')}km "
            f"{'RERA registered' if f.get('reraRegistered') else 'not RERA registered'} "
            f"{f.get('furnishingStatus', '')} "
            f"{'gym' if f.get('hasGym') else ''} "
            f"{'pool' if f.get('hasPool') else ''} "
            f"{'lift' if f.get('hasLift') else ''}"
        ).strip()

    elif entity_type == "developer":
        return (
            f"property developer {f.get('name', '')} "
            f"based in {f.get('city', '')} "
            f"reputation score {f.get('reputationScore', '')} "
            f"completion rate {f.get('completionRate', '')}% "
            f"delay rate {f.get('delayRate', '')}% "
            f"active projects {f.get('activeProjectCount', '')} "
            f"RERA registered {f.get('reraRegistered', '')}"
        ).strip()

    elif entity_type == "project":
        return (
            f"real estate project {f.get('name', '')} "
            f"by {f.get('developerName', '')} "
            f"in {f.get('locality', '')} {f.get('city', '')} "
            f"{f.get('totalUnits', '')} units "
            f"possession {f.get('possessionDate', '')} "
            f"price range {f.get('priceMin', '')} to {f.get('priceMax', '')} "
            f"configuration {f.get('configuration', '')}"
        ).strip()

    elif entity_type == "neighborhood":
        return (
            f"neighborhood {f.get('name', '')} in {f.get('city', '')} "
            f"metro connectivity {f.get('metroCount', '')} stations "
            f"schools {f.get('schoolCount', '')} "
            f"hospitals {f.get('hospitalCount', '')} "
            f"malls {f.get('mallCount', '')} "
            f"avg price per sqft {f.get('avgPricePerSqft', '')} "
            f"appreciation {f.get('appreciationPct', '')}% "
            f"walkability {f.get('walkScore', '')}"
        ).strip()

    elif entity_type == "document":
        return str(f.get("content", f.get("text", str(f))))

    elif entity_type == "conversation":
        messages = f.get("messages", [])
        if isinstance(messages, list):
            return " ".join(str(m) for m in messages[-10:])  # Last 10 messages
        return str(f.get("text", ""))

    else:
        # Generic fallback: concatenate all string values
        return " ".join(str(v) for v in f.values() if v is not None)


def run_embedding_inference(model: Any, text: str) -> List[float]:
    """Runs inference and returns a normalized embedding vector."""
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()
