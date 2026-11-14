"""API router aggregating Phase 5 routes."""

from fastapi import APIRouter
from backend.app.api.endpoints import auth, health, analyze, inspections

api_router = APIRouter()
api_router.include_router(auth.router, tags=["Authentication"])
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(analyze.router, tags=["Analysis"])
api_router.include_router(inspections.router, tags=["Inspections"])
