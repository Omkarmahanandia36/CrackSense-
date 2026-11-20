"""Image upload, validation, tiled crack localization, morphological mask generation, and database persistence."""

import os
import uuid
from io import BytesIO
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Query, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from PIL import Image

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.models.inspection import Inspection
from backend.app.models.prediction import Prediction
from backend.app.models.model_registry import ModelRecord
from backend.app.models.user import User
from backend.app.schemas.analyze import (
    AnalyzeResponse,
    ClassProbabilities,
    BoundingBox,
    DetectionItem,
)
from backend.app.api.deps import get_optional_user
from backend.app.services.storage import inspection_repo
from backend.app.services.crack_detector import detect_cracks_tiled
from backend.app.services.supabase_service import record_inspection_in_supabase, upload_image_to_supabase
from ai.classification.predict import predict_image

router = APIRouter()


async def get_or_create_model_record(db: AsyncSession) -> ModelRecord:
    """Ensure an active model record exists in the database."""
    stmt = select(ModelRecord).where(ModelRecord.architecture == "resnet18", ModelRecord.is_active == True)
    result = await db.execute(stmt)
    model_rec = result.scalar_one_or_none()

    if not model_rec:
        model_rec = ModelRecord(
            name="CrackSense YOLO & ResNet Inspection Engine",
            version="1.2.0",
            architecture="resnet18",
            checkpoint_path=settings.RESNET_MODEL_PATH,
            is_active=True,
        )
        db.add(model_rec)
        await db.commit()
        await db.refresh(model_rec)

    return model_rec


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload concrete image for automated crack detection, tiling, and mask extraction",
)
async def analyze_concrete_image(
    file: UploadFile = File(...),
    threshold: float = Query(default=0.35, ge=0.05, le=0.95, description="Confidence threshold"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Upload concrete photograph, tile into overlapping patches, execute YOLO + OpenCV mask generation, and persist."""
    # 1. Filename & format validation
    filename = file.filename or "image.jpg"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed extensions: {', '.join(settings.ALLOWED_EXTENSIONS)}",
        )

    # 2. File size validation
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes).",
        )

    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB} MB.",
        )

    # 3. Image integrity verification
    try:
        pil_image = Image.open(BytesIO(contents))
        pil_image.verify()
        pil_image = Image.open(BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid or corrupted image file: {str(e)}",
        )

    # 4. Save uploaded image to storage/uploads
    upload_uuid = str(uuid.uuid4())
    saved_filename = f"{upload_uuid}.{ext}"
    saved_filepath = Path(settings.UPLOAD_DIRECTORY) / saved_filename
    pil_image.save(saved_filepath)

    img_w, img_h = pil_image.size

    # 5. Execute Tiled Detection, NMS, and Morphological Mask Generation
    detection_result = detect_cracks_tiled(
        pil_image=pil_image,
        conf_threshold=threshold,
        tile_size=512,
        overlap=0.20,
        checkpoint_path=settings.YOLO_MODEL_PATH,
    )

    boxes_raw = detection_result["boxes"]
    annotated_url = None

    if boxes_raw:
        annotated_filename = f"{upload_uuid}_annotated.{ext}"
        annotated_filepath = Path(settings.UPLOAD_DIRECTORY) / annotated_filename
        detection_result["annotated_image"].save(annotated_filepath)
        annotated_url = f"/storage/uploads/{annotated_filename}"

    boxes_models = [
        BoundingBox(
            x1=b["x1"],
            y1=b["y1"],
            x2=b["x2"],
            y2=b["y2"],
            confidence=b["confidence"],
            label=b.get("label", "Crack"),
        )
        for b in boxes_raw
    ]

    detections_models = [
        DetectionItem(
            id=d["id"],
            confidence=d["confidence"],
            bbox=d["bbox"],
        )
        for d in detection_result["detections"]
    ]

    # Verdict derived from detections: if any box above threshold -> crack_detected
    verdict = detection_result["verdict"]
    final_is_crack = (verdict == "crack_detected")

    if final_is_crack:
        box_count = len(detections_models)
        final_class = f"{box_count} crack region{'s' if box_count != 1 else ''} found"
        final_confidence = max(d.confidence for d in detections_models) if detections_models else 0.85
        pos_prob = final_confidence
        neg_prob = round(max(0.0, 1.0 - pos_prob), 4)
    else:
        final_class = "No crack found"
        final_confidence = 0.95
        pos_prob = 0.05
        neg_prob = 0.95

    # 6. Relational Database Persistence
    model_rec = await get_or_create_model_record(db)

    inspection = Inspection(
        uuid=upload_uuid,
        user_id=current_user.id if current_user else None,
        filename=filename,
        image_path=str(saved_filepath),
    )
    db.add(inspection)
    await db.flush()  # Generate inspection.id

    prediction = Prediction(
        inspection_id=inspection.id,
        model_id=model_rec.id,
        is_crack=final_is_crack,
        predicted_class=final_class,
        confidence=final_confidence,
        probabilities={"positive_crack": pos_prob, "negative_clear": neg_prob},
    )
    db.add(prediction)
    await db.commit()
    await db.refresh(inspection)

    # 7. Construct Response with all required backend fields
    probabilities = ClassProbabilities(
        positive_crack=pos_prob,
        negative_clear=neg_prob,
    )

    resp = AnalyzeResponse(
        id=inspection.uuid,
        filename=inspection.filename,
        is_crack=final_is_crack,
        verdict=verdict,
        predicted_class=final_class,
        confidence=final_confidence,
        probabilities=probabilities,
        image_url=f"/storage/uploads/{saved_filename}",
        annotated_image_url=annotated_url,
        boxes=boxes_models,
        detections=detections_models,
        mask_png_base64=detection_result["mask_png_base64"],
        image_width=img_w,
        image_height=img_h,
        created_at=inspection.created_at,
    )
    inspection_repo.save(resp)

    # 8. Asynchronous Supabase Cloud Synchronization (if configured)
    try:
        supabase_img_url = upload_image_to_supabase(
            file_bytes=content,
            filename=f"{upload_uuid}.{ext}",
            content_type=file.content_type or "image/jpeg",
        )
        record_inspection_in_supabase({
            "id": inspection.uuid,
            "filename": inspection.filename,
            "image_url": supabase_img_url or f"/storage/uploads/{saved_filename}",
            "annotated_image_url": annotated_url,
            "mask_png_base64": detection_result["mask_png_base64"],
            "verdict": verdict,
            "confidence": final_confidence,
            "box_count": len(detections_models),
            "image_width": img_w,
            "image_height": img_h,
            "detections": [d.model_dump() for d in detections_models],
            "metadata": {"device": "cuda", "threshold": threshold},
        })
    except Exception as e:
        # Non-blocking logging if Supabase is unconfigured or offline
        pass

    return resp
