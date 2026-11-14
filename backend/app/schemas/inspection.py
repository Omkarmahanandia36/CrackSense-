"""Pydantic schemas for API request and response validation."""

from typing import List, Dict, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class BoundingBox(BaseModel):
    x1: float = Field(..., description="Top-left X coordinate")
    y1: float = Field(..., description="Top-left Y coordinate")
    x2: float = Field(..., description="Bottom-right X coordinate")
    y2: float = Field(..., description="Bottom-right Y coordinate")
    confidence: float = Field(..., description="Detection confidence (0.0 - 1.0)")
    label: str = Field(default="Crack", description="Object label")


class Probabilities(BaseModel):
    positive: float = Field(..., description="Probability of crack presence")
    negative: float = Field(..., description="Probability of intact surface")


class AnalysisResponse(BaseModel):
    id: int
    uuid: str
    filename: str
    is_crack: bool
    confidence: float
    predicted_class: str
    severity: str
    crack_percentage: float
    bounding_boxes: List[BoundingBox] = []
    probabilities: Optional[Dict[str, float]] = None
    image_url: str
    overlay_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InspectionListItem(BaseModel):
    id: int
    uuid: str
    filename: str
    is_crack: bool
    confidence: float
    severity: str
    crack_percentage: float
    image_url: str
    overlay_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ModelStatusResponse(BaseModel):
    app_name: str
    environment: str
    device: str
    cuda_available: bool
    models: Dict[str, Dict[str, Any]]
