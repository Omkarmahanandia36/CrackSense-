"""FastAPI Application Entry Point for CrackSense AI Backend (Phase 5)."""

import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Add project root to sys.path so imports resolve consistently
current_file = Path(__file__).resolve()
project_root = current_file.parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.core.config import settings
from backend.app.core.database import init_db
from backend.app.api.api_v1 import api_router
from backend.app.api.endpoints import auth, health, analyze, inspections


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables on application startup."""
    await init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="CrackSense AI - PostgreSQL Persistence & JWT Auth Backend.",
    version="1.0.0",
    lifespan=lifespan,
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

# Include routes under /api/v1 and at root for flexibility
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
app.include_router(auth.router, tags=["Authentication"])
app.include_router(health.router, tags=["Health"])
app.include_router(analyze.router, tags=["Analysis"])
app.include_router(inspections.router, tags=["Inspections"])


@app.get("/", tags=["Root"])
async def root():
    """Root info endpoint."""
    return {
        "name": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "status": "online",
        "docs": "/docs",
        "endpoints": {
            "register": f"{settings.API_V1_PREFIX}/auth/register",
            "login": f"{settings.API_V1_PREFIX}/auth/login",
            "health": f"{settings.API_V1_PREFIX}/health",
            "analyze": f"{settings.API_V1_PREFIX}/analyze",
            "inspections": f"{settings.API_V1_PREFIX}/inspections",
        },
    }
