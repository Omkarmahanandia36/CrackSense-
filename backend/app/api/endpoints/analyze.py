"""Image upload, validation, ResNet-18 crack classification, and database persistence."""

import os
import uuid
from io import BytesIO
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from PIL import Image

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.models.inspection import Inspection
from backend.app.models.prediction import Prediction
from backend.app.models.model_registry import ModelRecord
from backend.app.models.user import User
from backend.app.schemas.analyze import AnalyzeResponse, ClassProbabilities, BoundingBox
from backend.app.api.deps import get_optional_user
from backend.app.services.storage import inspection_repo
from ai.classification.predict import predict_image
from ai.detection.predict import predict_crack_boxes

router = APIRouter()


async def get_or_create_model_record(db: AsyncSession) -> ModelRecord:
    """Ensure an active model record exists in the database."""
    stmt = select(ModelRecord).where(ModelRecord.architecture == "resnet18", ModelRecord.is_active == True)
    result = await db.execute(stmt)
    model_rec = result.scalar_one_or_none()

    if not model_rec:
        model_rec = ModelRecord(
            name="ResNet-18 Crack Classifier",
            version="1.0.0",
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
    summary="Upload concrete image for crack classification and database logging",
)
async def analyze_concrete_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Upload concrete photograph, validate format/size, execute ResNet inference, and persist in PostgreSQL."""
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

    # 5. Execute Stage 1 ResNet-18 Classification
    try:
        pred_result = predict_image(
            image_input=pil_image,
            checkpoint_path=settings.RESNET_MODEL_PATH,
            threshold=0.5,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI model inference error (Stage 1): {str(e)}",
        )

    # 5b. Execute Stage 2 YOLO Crack Localization
    annotated_url = None
    boxes_models = []
    try:
        yolo_result = predict_crack_boxes(
            image_input=pil_image,
            checkpoint_path=settings.YOLO_MODEL_PATH,
        )
        if yolo_result["boxes"]:
            annotated_filename = f"{upload_uuid}_annotated.{ext}"
            annotated_filepath = Path(settings.UPLOAD_DIRECTORY) / annotated_filename
            yolo_result["annotated_image"].save(annotated_filepath)
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
                for b in yolo_result["boxes"]
            ]
    except Exception as e:
        # Non-fatal warning: if YOLO localization fails, classification response still completes
        print(f"[!] Warning: YOLO Stage 2 localization error: {e}")

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
        is_crack=pred_result["is_crack"],
        predicted_class=pred_result["predicted_class"],
        confidence=pred_result["confidence"],
        probabilities=pred_result["probabilities"],
    )
    db.add(prediction)
    await db.commit()
    await db.refresh(inspection)

    # 7. Construct Response
    probabilities = ClassProbabilities(
        positive_crack=pred_result["probabilities"]["positive_crack"],
        negative_clear=pred_result["probabilities"]["negative_clear"],
    )

    resp = AnalyzeResponse(
        id=inspection.uuid,
        filename=inspection.filename,
        is_crack=pred_result["is_crack"],
        predicted_class=pred_result["predicted_class"],
        confidence=pred_result["confidence"],
        probabilities=probabilities,
        image_url=f"/storage/uploads/{saved_filename}",
        annotated_image_url=annotated_url,
        boxes=boxes_models,
        created_at=inspection.created_at,
    )
    inspection_repo.save(resp)
    return resp
