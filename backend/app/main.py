"""FastAPI Application Entry Point for CrackSense AI Backend (Phase 3)."""

import os
import sys
from pathlib import Path

# Add project root to sys.path so imports resolve consistently
current_file = Path(__file__).resolve()
project_root = current_file.parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.core.config import settings
from backend.app.api.api_v1 import api_router
from backend.app.api.endpoints import health, analyze

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered concrete crack classification backend using ResNet-18 and FastAPI.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded images statically
os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True)
app.mount("/storage/uploads", StaticFiles(directory=settings.UPLOAD_DIRECTORY), name="uploads")

# Include routes under /api/v1 and directly at root for convenience
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
app.include_router(health.router, tags=["Health"])
app.include_router(analyze.router, tags=["Analysis"])


@app.get("/", tags=["Root"])
async def root():
    """Root info endpoint."""
    return {
        "name": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "status": "online",
        "endpoints": {
            "health": "/health",
            "analyze": "/analyze",
            "docs": "/docs",
        },
    }
