"""Database models for inspection records and AI detection history."""

import uuid
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, JSON
from backend.app.core.database import Base


class InspectionRecord(Base):
    """Stores full details and metrics of an analyzed concrete surface inspection."""

    __tablename__ = "inspection_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    uuid = Column(String(36), unique=True, index=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String(255), nullable=False)
    image_path = Column(String(500), nullable=False)
    overlay_path = Column(String(500), nullable=True)

    # Classification metrics
    is_crack = Column(Boolean, nullable=False, default=False)
    confidence = Column(Float, nullable=False, default=0.0)
    predicted_class = Column(String(50), nullable=False, default="Negative")

    # Localization and Segmentation metrics
    severity = Column(String(50), nullable=False, default="None")
    crack_percentage = Column(Float, nullable=False, default=0.0)
    bounding_boxes = Column(JSON, nullable=True, default=list)
    probabilities = Column(JSON, nullable=True, default=dict)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "uuid": self.uuid,
            "filename": self.filename,
            "image_path": self.image_path,
            "overlay_path": self.overlay_path,
            "is_crack": self.is_crack,
            "confidence": self.confidence,
            "predicted_class": self.predicted_class,
            "severity": self.severity,
            "crack_percentage": self.crack_percentage,
            "bounding_boxes": self.bounding_boxes or [],
            "probabilities": self.probabilities or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
