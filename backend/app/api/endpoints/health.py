"""System health check and runtime platform diagnostics endpoint."""

import os
from fastapi import APIRouter
import torch

from backend.app.core.config import settings
from backend.app.schemas.analyze import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Returns application status, hardware device, and ResNet-18 checkpoint availability."""
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model_exists = os.path.exists(settings.RESNET_MODEL_PATH)

    return HealthResponse(
        status="healthy",
        app_name=settings.APP_NAME,
        environment=settings.APP_ENV,
        device=device,
        model_loaded=model_exists,
    )
