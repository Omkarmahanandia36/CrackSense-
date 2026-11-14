"""AI models status, registry, and hardware acceleration endpoint."""

from fastapi import APIRouter
from backend.app.schemas.inspection import ModelStatusResponse
from backend.app.services.ai_engine import ai_engine

router = APIRouter()


@router.get("/models", response_model=ModelStatusResponse)
async def get_models_status():
    """Retrieve status, stages, and architecture details of active AI models."""
    return ai_engine.get_status()
