"""Report database model referencing generated PDF documentation."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class ReportRecord(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False)
    report_path = Column(String(500), nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    inspection = relationship("Inspection", back_populates="reports")
