"""Prediction database model storing deep learning inference findings."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False)
    model_id = Column(Integer, ForeignKey("models.id", ondelete="SET NULL"), nullable=True)

    is_crack = Column(Boolean, nullable=False, default=False)
    predicted_class = Column(String(50), nullable=False, default="Negative (Clear)")
    confidence = Column(Float, nullable=False, default=0.0)
    probabilities = Column(JSON, nullable=True, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    inspection = relationship("Inspection", back_populates="predictions")
    model = relationship("ModelRecord", back_populates="predictions")
