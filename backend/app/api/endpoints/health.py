"""Health check and system diagnostics endpoint."""

from fastapi import APIRouter
import torch
import sys

from backend.app.core.config import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    """System health check and runtime platform diagnostics."""
    return {
        "status": "online",
        "app_name": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "python_version": sys.version.split()[0],
        "torch_version": torch.__version__,
        "cuda_available": torch.cuda.is_available(),
        "device_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
    }
