# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/api/v1/router.py
# Aggregates all v1 sub-routers under the /v1 prefix.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.api.v1.models_router import router as models_router
from app.api.v1.image import router as image_router
from app.api.v1.valuation import router as valuation_router
from app.api.v1.embedding import router as embedding_router

v1_router = APIRouter(prefix="/v1")

v1_router.include_router(health_router)
v1_router.include_router(models_router)
v1_router.include_router(image_router)
v1_router.include_router(valuation_router)
v1_router.include_router(embedding_router)
