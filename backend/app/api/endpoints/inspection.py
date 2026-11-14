"""Inspection and analysis API endpoints."""

import os
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from backend.app.core.database import get_db
from backend.app.models.inspection import InspectionRecord
from backend.app.schemas.inspection import AnalysisResponse, InspectionListItem
from backend.app.services.ai_engine import ai_engine
from backend.app.services.image_processor import image_processor
from backend.app.services.report_generator import report_generator
from ai.preprocessing.transforms import validate_image

router = APIRouter()


@router.post("/inspections/analyze", response_model=AnalysisResponse, status_code=status.HTTP_201_CREATED)
async def analyze_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a concrete surface photograph and execute multi-stage AI crack analysis."""
    contents = await file.read()
    is_valid, error_msg, pil_image = validate_image(contents, filename=file.filename or "")

    if not is_valid or pil_image is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg or "Invalid image file")

    # Save original uploaded image
    file_uuid, orig_path, orig_filename = image_processor.save_upload(pil_image, file.filename or "image.jpg")

    # Run AI inference pipeline
    analysis_data, overlay_image = ai_engine.analyze(pil_image)

    # Save visualization overlay
    overlay_path, overlay_filename = image_processor.save_overlay(overlay_image, file_uuid)

    # Persist inspection record in database
    record = InspectionRecord(
        uuid=file_uuid,
        filename=file.filename or "image.jpg",
        image_path=orig_path,
        overlay_path=overlay_path,
        is_crack=analysis_data["is_crack"],
        confidence=analysis_data["confidence"],
        predicted_class=analysis_data["predicted_class"],
        severity=analysis_data["severity"],
        crack_percentage=analysis_data["crack_percentage"],
        bounding_boxes=analysis_data["bounding_boxes"],
        probabilities=analysis_data["probabilities"],
    )

    db.add(record)
    await db.commit()
    await db.refresh(record)

    return AnalysisResponse(
        id=record.id,
        uuid=record.uuid,
        filename=record.filename,
        is_crack=record.is_crack,
        confidence=record.confidence,
        predicted_class=record.predicted_class,
        severity=record.severity,
        crack_percentage=record.crack_percentage,
        bounding_boxes=record.bounding_boxes,
        probabilities=record.probabilities,
        image_url=f"/storage/uploads/{orig_filename}",
        overlay_url=f"/storage/uploads/{overlay_filename}",
        created_at=record.created_at,
    )


@router.get("/inspections", response_model=List[InspectionListItem])
async def list_inspections(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List historical inspection records ordered by most recent."""
    stmt = select(InspectionRecord).order_by(desc(InspectionRecord.created_at)).offset(skip).limit(limit)
    result = await db.execute(stmt)
    records = result.scalars().all()

    items = []
    for r in records:
        orig_filename = os.path.basename(r.image_path)
        overlay_filename = os.path.basename(r.overlay_path) if r.overlay_path else None
        items.append(
            InspectionListItem(
                id=r.id,
                uuid=r.uuid,
                filename=r.filename,
                is_crack=r.is_crack,
                confidence=r.confidence,
                severity=r.severity,
                crack_percentage=r.crack_percentage,
                image_url=f"/storage/uploads/{orig_filename}",
                overlay_url=f"/storage/uploads/{overlay_filename}" if overlay_filename else None,
                created_at=r.created_at,
            )
        )
    return items


@router.get("/inspections/{record_id}", response_model=AnalysisResponse)
async def get_inspection(
    record_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get full details of a specific inspection record."""
    stmt = select(InspectionRecord).where(InspectionRecord.id == record_id)
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Inspection record #{record_id} not found")

    orig_filename = os.path.basename(record.image_path)
    overlay_filename = os.path.basename(record.overlay_path) if record.overlay_path else None

    return AnalysisResponse(
        id=record.id,
        uuid=record.uuid,
        filename=record.filename,
        is_crack=record.is_crack,
        confidence=record.confidence,
        predicted_class=record.predicted_class,
        severity=record.severity,
        crack_percentage=record.crack_percentage,
        bounding_boxes=record.bounding_boxes or [],
        probabilities=record.probabilities or {},
        image_url=f"/storage/uploads/{orig_filename}",
        overlay_url=f"/storage/uploads/{overlay_filename}" if overlay_filename else None,
        created_at=record.created_at,
    )


@router.get("/inspections/{record_id}/report")
async def download_inspection_report(
    record_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Generate and download a professional PDF inspection report."""
    stmt = select(InspectionRecord).where(InspectionRecord.id == record_id)
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Inspection record #{record_id} not found")

    pdf_path = report_generator.generate_pdf_report(
        record_id=record.id,
        record_uuid=record.uuid,
        filename=record.filename,
        created_at=record.created_at.strftime("%Y-%m-%d %H:%M:%S") if record.created_at else "N/A",
        is_crack=record.is_crack,
        confidence=record.confidence,
        severity=record.severity,
        crack_percentage=record.crack_percentage,
        overlay_path=record.overlay_path,
        boxes=record.bounding_boxes,
    )

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=f"CrackSense_Report_{record.uuid[:8]}.pdf",
    )
