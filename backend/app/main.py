"""FastAPI Application Entry Point for CrackSense AI Backend."""

import os
import sys
from pathlib import Path
import logging

# Ensure project root is in sys.path so imports resolve from any working directory
current_file = Path(__file__).resolve()
project_root = current_file.parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.app.core.config import settings
from backend.app.core.database import init_db
from backend.app.api.api_v1 import api_router
from backend.app.services.ai_engine import ai_engine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("cracksense")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle management."""
    logger.info("Initializing CrackSense AI database tables...")
    await init_db()
    logger.info(f"AI Engine loaded successfully on {ai_engine.device}.")
    yield
    logger.info("Shutting down CrackSense AI backend...")


app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered concrete surface crack detection, localization, and segmentation API.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for desktop and frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for inspection images and visual overlays
os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True)
app.mount("/storage/uploads", StaticFiles(directory=settings.UPLOAD_DIRECTORY), name="uploads")

# Include API v1 router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

frontend_dist = project_root / "desktop" / "frontend" / "dist"
if (frontend_dist / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")


@app.get("/", tags=["Root"])
async def root(request: Request):
    """Serve desktop/web frontend for browser requests, or JSON API info for API clients."""
    accept = request.headers.get("accept", "")
    index_file = frontend_dist / "index.html"

    if "text/html" in accept and index_file.exists():
        return FileResponse(index_file)

    return {
        "name": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "status": "active",
        "api_documentation": "/docs",
        "endpoints": {
            "health": f"{settings.API_V1_PREFIX}/health",
            "models": f"{settings.API_V1_PREFIX}/models",
            "analyze": f"{settings.API_V1_PREFIX}/inspections/analyze",
            "history": f"{settings.API_V1_PREFIX}/inspections",
        },
    }
