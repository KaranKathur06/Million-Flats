# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MillionFlats ML Sidecar — FastAPI VPS Service
# Runs on a separate VPS (e.g. Hetzner CX31 or DigitalOcean 4GB Droplet)
# Called by the Next.js platform via HTTP when GPU/CPU-intensive tasks are needed
#
# Endpoints:
#   POST /analyze/image        → Computer vision (defect detection, AI detection)
#   POST /predict/valuation    → XGBoost/LightGBM AVM prediction
#   POST /embed/property       → Generate pgvector embedding for similarity search
#   POST /predict/investment   → Investment score prediction
#   GET  /health               → Health check + model status
#   GET  /models               → List loaded models and versions
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from typing import Optional, List
import os
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ml-sidecar")

app = FastAPI(
    title="MillionFlats ML Sidecar",
    description="GPU/CPU-intensive AI inference service for the MillionFlats platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("PLATFORM_ORIGIN", "https://millionflats.com")],
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

# ─── Auth ─────────────────────────────────────────────────────────────────────

API_SECRET = os.getenv("ML_VPS_SECRET", "")

def verify_auth(authorization: str = Header(...)):
    if not API_SECRET:
        raise HTTPException(status_code=500, detail="Service not configured")
    if authorization != f"Bearer {API_SECRET}":
        raise HTTPException(status_code=401, detail="Unauthorized")


# ─── Lazy Model Loading ────────────────────────────────────────────────────────
# Models are loaded on first request to keep startup time fast

_models = {}

def get_valuation_model():
    if "valuation" not in _models:
        try:
            import joblib
            model_path = os.getenv("VALUATION_MODEL_PATH", "models/avm_xgboost_v1.pkl")
            _models["valuation"] = joblib.load(model_path)
            logger.info(f"Loaded valuation model from {model_path}")
        except Exception as e:
            logger.warning(f"Valuation model not available: {e}")
            _models["valuation"] = None
    return _models["valuation"]

def get_clip_model():
    if "clip" not in _models:
        try:
            from transformers import CLIPProcessor, CLIPModel
            _models["clip"] = {
                "model": CLIPModel.from_pretrained("openai/clip-vit-base-patch32"),
                "processor": CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32"),
            }
            logger.info("Loaded CLIP model")
        except Exception as e:
            logger.warning(f"CLIP model not available: {e}")
            _models["clip"] = None
    return _models["clip"]


# ─── Request / Response Schemas ───────────────────────────────────────────────

class ImageAnalysisRequest(BaseModel):
    url: str
    entityId: Optional[str] = None
    entityType: Optional[str] = None

class ImageAnalysisResponse(BaseModel):
    url: str
    isAiGenerated: bool
    isManipulated: bool
    manipulationScore: float
    isBlurry: bool
    hasLightingIssues: bool
    hasDefects: bool
    defectsDetected: List[dict]
    qualityScore: float
    trustScore: float
    roomType: Optional[str]
    estimatedSqft: Optional[float]
    isVirtualStaged: bool
    modelUsed: str
    processingMs: int

class ValuationRequest(BaseModel):
    entityId: str
    entityType: str
    features: dict  # PropertyFeatureInput flattened as dict

class ValuationResponse(BaseModel):
    entityId: str
    predictedPrice: float
    confidenceInterval: dict  # {"low": x, "mid": y, "high": z}
    featureImportance: List[dict]
    modelVersion: str
    processingMs: int

class EmbeddingRequest(BaseModel):
    entityId: str
    entityType: str
    features: dict  # property feature dict for embedding

class EmbeddingResponse(BaseModel):
    entityId: str
    embedding: List[float]  # 384-dim vector
    modelVersion: str
    processingMs: int


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "millionflats-ml-sidecar",
        "version": "1.0.0",
        "models": {
            "valuation": "loaded" if _models.get("valuation") else "not_loaded",
            "clip": "loaded" if _models.get("clip") else "not_loaded",
        },
        "timestamp": time.time(),
    }

@app.get("/models")
async def list_models(_: str = Depends(verify_auth)):
    return {
        "models": [
            {
                "name": "avm_xgboost_v1",
                "type": "regression",
                "purpose": "property_valuation",
                "status": "loaded" if _models.get("valuation") else "not_loaded",
                "features": 47,
            },
            {
                "name": "clip-vit-base-patch32",
                "type": "vision_transformer",
                "purpose": "image_analysis",
                "status": "loaded" if _models.get("clip") else "not_loaded",
            },
        ]
    }


@app.post("/analyze/image", response_model=ImageAnalysisResponse)
async def analyze_image(
    req: ImageAnalysisRequest,
    _: str = Depends(verify_auth)
):
    start = time.time()

    # Phase 1: URL-based heuristics (always available)
    url_lower = req.url.lower()
    ai_patterns = ["midjourney", "dalle", "stable-diffusion", "civitai", "getimg"]
    stock_patterns = ["shutterstock", "getty", "istockphoto", "unsplash", "pexels"]
    is_ai_generated = any(p in url_lower for p in ai_patterns)
    is_stock = any(p in url_lower for p in stock_patterns)
    is_blurry = any(p in url_lower for p in ["thumb", "small", "xs_", "_xs"])
    is_virtual_staged = any(p in url_lower for p in ["virtual", "staged", "render"])

    manipulation_score = 0.0
    if is_ai_generated: manipulation_score = 85.0
    elif is_stock: manipulation_score = 70.0

    quality_score = 75.0
    if is_blurry: quality_score -= 30
    if is_ai_generated: quality_score -= 20
    if is_stock: quality_score -= 15

    # Phase 2: CLIP-based image analysis (if model loaded)
    room_type = None
    defects_detected = []
    has_defects = False
    has_lighting_issues = False

    clip = get_clip_model()
    if clip and req.url.startswith("http"):
        try:
            import requests
            from PIL import Image
            import torch
            import io

            response = requests.get(req.url, timeout=10, stream=True)
            img = Image.open(io.BytesIO(response.content)).convert("RGB")

            # Room classification
            room_labels = [
                "a living room", "a bedroom", "a kitchen", "a bathroom",
                "an exterior view", "a balcony", "a floor plan", "a lobby"
            ]
            inputs = clip["processor"](
                text=room_labels, images=img, return_tensors="pt", padding=True
            )
            with torch.no_grad():
                outputs = clip["model"](**inputs)
                probs = outputs.logits_per_image.softmax(dim=1).squeeze()
                best_idx = probs.argmax().item()
                room_type_raw = room_labels[best_idx].replace("a ", "").replace("an ", "")
                room_type_map = {
                    "living room": "LIVING_ROOM", "bedroom": "BEDROOM",
                    "kitchen": "KITCHEN", "bathroom": "BATHROOM",
                    "exterior view": "EXTERIOR", "balcony": "BALCONY",
                    "floor plan": "FLOOR_PLAN", "lobby": "LOBBY",
                }
                room_type = room_type_map.get(room_type_raw, "UNKNOWN")

            # AI-generated image detection
            ai_labels = ["a photorealistic AI generated image", "a real photograph"]
            inputs2 = clip["processor"](
                text=ai_labels, images=img, return_tensors="pt", padding=True
            )
            with torch.no_grad():
                out2 = clip["model"](**inputs2)
                probs2 = out2.logits_per_image.softmax(dim=1).squeeze()
                ai_prob = float(probs2[0].item())
                if ai_prob > 0.6:
                    is_ai_generated = True
                    manipulation_score = max(manipulation_score, ai_prob * 100)

            # Defect detection
            defect_labels = [
                "a wall with water damage or stains",
                "a ceiling with cracks or damage",
                "a floor with visible damage",
                "a clean well-maintained room",
            ]
            inputs3 = clip["processor"](
                text=defect_labels, images=img, return_tensors="pt", padding=True
            )
            with torch.no_grad():
                out3 = clip["model"](**inputs3)
                probs3 = out3.logits_per_image.softmax(dim=1).squeeze()
                for i, label in enumerate(defect_labels[:-1]):
                    if float(probs3[i].item()) > 0.45:
                        has_defects = True
                        defects_detected.append({
                            "type": label.split(" with ")[1] if " with " in label else label,
                            "confidence": float(probs3[i].item()),
                            "description": label,
                        })

        except Exception as e:
            logger.warning(f"CLIP analysis failed for {req.url}: {e}")

    trust_score = max(0.0, 100.0 - manipulation_score - (20.0 if is_blurry else 0))

    return ImageAnalysisResponse(
        url=req.url,
        isAiGenerated=is_ai_generated,
        isManipulated=manipulation_score > 50,
        manipulationScore=round(manipulation_score, 1),
        isBlurry=is_blurry,
        hasLightingIssues=has_lighting_issues,
        hasDefects=has_defects,
        defectsDetected=defects_detected,
        qualityScore=round(max(0.0, quality_score), 1),
        trustScore=round(max(0.0, trust_score), 1),
        roomType=room_type,
        estimatedSqft=None,
        isVirtualStaged=is_virtual_staged,
        modelUsed="clip-vit-base-patch32" if clip else "heuristic_v1",
        processingMs=int((time.time() - start) * 1000),
    )


@app.post("/predict/valuation", response_model=ValuationResponse)
async def predict_valuation(
    req: ValuationRequest,
    _: str = Depends(verify_auth)
):
    start = time.time()
    model = get_valuation_model()

    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Valuation model not loaded. Train and deploy model first."
        )

    try:
        import numpy as np

        # Build feature vector from request
        FEATURE_ORDER = [
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

        features = req.features
        X = np.array([[features.get(f, 0) or 0 for f in FEATURE_ORDER]])
        prediction = float(model.predict(X)[0])

        # Confidence interval from model's internal uncertainty
        # (For XGBoost: use quantile regression or prediction std from ensemble)
        std_estimate = prediction * 0.08  # ±8% default until proper uncertainty model
        ci = {
            "low": round(prediction - std_estimate, 0),
            "mid": round(prediction, 0),
            "high": round(prediction + std_estimate, 0),
        }

        # Feature importance from model
        importance = []
        if hasattr(model, "feature_importances_"):
            fi = model.feature_importances_
            top_idx = fi.argsort()[-10:][::-1]
            for idx in top_idx:
                importance.append({
                    "feature": FEATURE_ORDER[idx] if idx < len(FEATURE_ORDER) else f"feat_{idx}",
                    "importance": round(float(fi[idx]), 4),
                    "value": round(float(X[0][idx]), 2),
                })

        return ValuationResponse(
            entityId=req.entityId,
            predictedPrice=prediction,
            confidenceInterval=ci,
            featureImportance=importance,
            modelVersion="avm_xgboost_v1",
            processingMs=int((time.time() - start) * 1000),
        )

    except Exception as e:
        logger.error(f"Valuation prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/embed/property", response_model=EmbeddingResponse)
async def embed_property(
    req: EmbeddingRequest,
    _: str = Depends(verify_auth)
):
    start = time.time()

    try:
        from sentence_transformers import SentenceTransformer
        import numpy as np

        if "sentence_transformer" not in _models:
            _models["sentence_transformer"] = SentenceTransformer("all-MiniLM-L6-v2")

        model = _models["sentence_transformer"]

        # Build text description from features for semantic embedding
        f = req.features
        text = (
            f"{f.get('propertyType', 'property')} "
            f"{f.get('bedroomCount', '')}BR {f.get('bathroomCount', '')}BA "
            f"in {f.get('community', '')} {f.get('city', '')} "
            f"{f.get('carpetAreaSqft', '')} sqft "
            f"floor {f.get('floorNumber', '')} of {f.get('totalFloors', '')} "
            f"metro {f.get('distanceMetroKm', '')}km "
            f"{'RERA' if f.get('reraRegistered') else ''} "
            f"{f.get('furnishingStatus', '')}"
        )

        embedding = model.encode(text, normalize_embeddings=True)

        return EmbeddingResponse(
            entityId=req.entityId,
            embedding=embedding.tolist(),
            modelVersion="all-MiniLM-L6-v2",
            processingMs=int((time.time() - start) * 1000),
        )
    except Exception as e:
        logger.error(f"Embedding failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Entrypoint ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8001")),
        reload=os.getenv("ENV", "production") == "development",
        workers=int(os.getenv("WORKERS", "2")),
    )
