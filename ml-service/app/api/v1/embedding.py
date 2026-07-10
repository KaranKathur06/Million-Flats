# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/api/v1/embedding.py
# POST /v1/embed/property
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from app.auth.bearer import verify_auth
from app.pipelines.embedding_pipeline import run_embedding_pipeline
from app.schemas.requests import EmbeddingRequest
from app.schemas.responses import EmbeddingResponse

router = APIRouter(tags=["Embeddings"])


@router.post(
    "/embed/property",
    response_model=EmbeddingResponse,
    summary="Generate semantic embedding vector for similarity search",
    description=(
        "Converts structured property/entity features into a 384-dimensional "
        "normalized embedding vector for pgvector similarity search. "
        "Supports entity types: property, developer, project, neighborhood, "
        "document, image, conversation."
    ),
)
async def embed_property(
    req: EmbeddingRequest,
    request: Request,
    _: str = Depends(verify_auth),
) -> EmbeddingResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    return await run_embedding_pipeline(req, request_id=request_id)
