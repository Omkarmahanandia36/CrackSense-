"""Pydantic V2 schemas for Inspections, Predictions, and Models."""

from typing import List, Dict, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class PredictionResponse(BaseModel):
    id: int
    is_crack: bool
    predicted_class: str
    confidence: float
    probabilities: Optional[Dict[str, float]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InspectionListItem(BaseModel):
    id: int
    uuid: str
    filename: str
    is_crack: bool
    predicted_class: str
    confidence: float
    image_url: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InspectionDetailResponse(BaseModel):
    id: int
    uuid: str
    filename: str
    image_url: str
    created_at: datetime
    predictions: List[PredictionResponse] = []

    model_config = ConfigDict(from_attributes=True)
