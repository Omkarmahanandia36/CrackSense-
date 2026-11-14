"""Pydantic V2 schemas for Phase 3 request and response serialization."""

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


class AnalyzeResponse(BaseModel):
    id: str = Field(..., description="Unique inspection identifier (UUID)")
    filename: str = Field(..., description="Original image filename")
    is_crack: bool = Field(..., description="True if concrete crack detected, False if clean")
    predicted_class: str = Field(..., description="'Positive (Crack)' or 'Negative (Clear)'")
    confidence: float = Field(..., description="Prediction confidence score (0.0 to 1.0)")
    probabilities: ClassProbabilities = Field(..., description="Class probability distribution")
    image_url: str = Field(..., description="Static URL to access stored uploaded photograph")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(from_attributes=True)
