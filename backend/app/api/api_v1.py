"""API router aggregating Phase 3 endpoint routes."""

from fastapi import APIRouter
from backend.app.api.endpoints import health, analyze

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(analyze.router, tags=["Analysis"])
