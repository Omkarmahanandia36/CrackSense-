"""Inspection history management: list, view, and delete past inspection records."""

import os
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from backend.app.core.database import get_db
from backend.app.models.inspection import Inspection
from backend.app.models.prediction import Prediction
from backend.app.schemas.inspection import InspectionListItem, InspectionDetailResponse, PredictionResponse

router = APIRouter()


@router.get("/inspections", response_model=List[InspectionListItem])
async def list_inspections(
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List historical inspection scans ordered from newest to oldest."""
    stmt = (
        select(Inspection)
        .options(selectinload(Inspection.predictions))
        .order_by(desc(Inspection.created_at))
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    inspections = result.scalars().all()

    items = []
    for insp in inspections:
        pred = insp.predictions[0] if insp.predictions else None
        orig_filename = os.path.basename(insp.image_path)
        items.append(
            InspectionListItem(
                id=insp.id,
                uuid=insp.uuid,
                filename=insp.filename,
                is_crack=pred.is_crack if pred else False,
                predicted_class=pred.predicted_class if pred else "Unknown",
                confidence=pred.confidence if pred else 0.0,
                image_url=f"/storage/uploads/{orig_filename}",
                created_at=insp.created_at,
            )
        )
    return items


@router.get("/inspections/{inspection_id}", response_model=InspectionDetailResponse)
async def get_inspection(
    inspection_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full details of an inspection along with its prediction findings."""
    stmt = (
        select(Inspection)
        .options(selectinload(Inspection.predictions))
        .where(Inspection.id == inspection_id)
    )
    result = await db.execute(stmt)
    insp = result.scalar_one_or_none()

    if not insp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection #{inspection_id} not found.",
        )

    orig_filename = os.path.basename(insp.image_path)
    pred_items = [
        PredictionResponse(
            id=p.id,
            is_crack=p.is_crack,
            predicted_class=p.predicted_class,
            confidence=p.confidence,
            probabilities=p.probabilities,
            created_at=p.created_at,
        )
        for p in insp.predictions
    ]

    return InspectionDetailResponse(
        id=insp.id,
        uuid=insp.uuid,
        filename=insp.filename,
        image_url=f"/storage/uploads/{orig_filename}",
        created_at=insp.created_at,
        predictions=pred_items,
    )


@router.delete("/inspections/{inspection_id}", status_code=status.HTTP_200_OK)
async def delete_inspection(
    inspection_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete an inspection record, cascading predictions, and removing stored files."""
    stmt = select(Inspection).where(Inspection.id == inspection_id)
    result = await db.execute(stmt)
    insp = result.scalar_one_or_none()

    if not insp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection #{inspection_id} not found.",
        )

    # Delete physical image file from storage if it exists
    if os.path.exists(insp.image_path):
        try:
            os.remove(insp.image_path)
        except Exception:
            pass

    await db.delete(insp)
    await db.commit()

    return {"status": "deleted", "id": inspection_id}
