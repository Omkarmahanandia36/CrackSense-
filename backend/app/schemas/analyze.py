"""Pydantic V2 schemas for image analysis, crack classification, and YOLO localization."""

from typing import Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class HealthResponse(BaseModel):
    status: str = Field(..., description="System operational status")
    app_name: str = Field(..., description="Application name")
    environment: str = Field(..., description="Deployment environment")
    device: str = Field(..., description="Inference device (cuda / cpu)")
    model_loaded: bool = Field(..., description="Whether ResNet-18 checkpoint is loaded")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(from_attributes=True)


class ClassProbabilities(BaseModel):
    positive_crack: float = Field(..., description="Estimated probability of crack presence (0.0 to 1.0)")
    negative_clear: float = Field(..., description="Estimated probability of clear surface (0.0 to 1.0)")


class BoundingBox(BaseModel):
    x1: float = Field(..., description="Top-left X coordinate")
    y1: float = Field(..., description="Top-left Y coordinate")
    x2: float = Field(..., description="Bottom-right X coordinate")
    y2: float = Field(..., description="Bottom-right Y coordinate")
    confidence: float = Field(..., description="Detection confidence score (0.0 to 1.0)")
    label: str = Field(default="Crack", description="Object label")

    model_config = ConfigDict(from_attributes=True)


class DetectionItem(BaseModel):
    id: int = Field(..., description="Unique detection identifier")
    confidence: float = Field(..., description="Detection confidence score (0.0 to 1.0)")
    bbox: List[float] = Field(..., description="Bounding box [x, y, w, h] in original pixel coordinates")

    model_config = ConfigDict(from_attributes=True)


class AnalyzeResponse(BaseModel):
    id: str = Field(..., description="Unique inspection identifier (UUID)")
    filename: str = Field(..., description="Original image filename")
    is_crack: bool = Field(..., description="True if concrete crack detected, False if clean")
    verdict: str = Field(default="no_crack", description="'crack_detected' | 'no_crack'")
    predicted_class: str = Field(..., description="'Positive (Crack)' or 'Negative (Clear)'")
    confidence: float = Field(..., description="Prediction confidence score (0.0 to 1.0)")
    probabilities: ClassProbabilities = Field(..., description="Class probability distribution")
    image_url: str = Field(..., description="Static URL to access stored uploaded photograph")
    annotated_image_url: Optional[str] = Field(default=None, description="Static URL to image with rendered bounding boxes")
    boxes: List[BoundingBox] = Field(default=[], description="Detected bounding boxes for localized cracks")
    detections: List[DetectionItem] = Field(default=[], description="Detections list with [x, y, w, h]")
    mask_png_base64: Optional[str] = Field(default=None, description="Transparent PNG mask encoded as base64")
    image_width: Optional[int] = Field(default=None, description="Width of the inspected image in pixels")
    image_height: Optional[int] = Field(default=None, description="Height of the inspected image in pixels")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(from_attributes=True)
