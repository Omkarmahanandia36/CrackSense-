"""API router aggregating v1 endpoint routes."""

from fastapi import APIRouter
from backend.app.api.endpoints import health, models, inspection

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(models.router, tags=["Models"])
api_router.include_router(inspection.router, tags=["Inspections"])
