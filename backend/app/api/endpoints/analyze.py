"""Image upload, validation, and ResNet-18 crack classification endpoint."""

import os
import uuid
from io import BytesIO
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from PIL import Image

from backend.app.core.config import settings
from backend.app.schemas.analyze import AnalyzeResponse, ClassProbabilities
from backend.app.services.storage import inspection_repo
from ai.classification.predict import predict_image

router = APIRouter()


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload concrete image for crack classification",
)
async def analyze_concrete_image(file: UploadFile = File(...)):
    """Upload concrete surface photograph, validate format/size, execute ResNet-18 inference, and store result."""
    # 1. Filename & extension validation
    filename = file.filename or "image.jpg"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed extensions: {', '.join(settings.ALLOWED_EXTENSIONS)}",
        )

    # 2. Read and validate file content
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
        pil_image.verify()  # Check byte-level integrity
        pil_image = Image.open(BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid or corrupted image file: {str(e)}",
        )

    # 4. Save uploaded image to storage/uploads
    upload_id = str(uuid.uuid4())
    saved_filename = f"{upload_id}.{ext}"
    saved_filepath = Path(settings.UPLOAD_DIRECTORY) / saved_filename
    pil_image.save(saved_filepath)

    # 5. Run ResNet-18 inference
    try:
        pred_result = predict_image(
            image_input=pil_image,
            checkpoint_path=settings.RESNET_MODEL_PATH,
            threshold=0.5,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI model inference error: {str(e)}",
        )

    # 6. Construct response and save to in-memory/JSON repository
    image_url = f"/storage/uploads/{saved_filename}"
    probabilities = ClassProbabilities(
        positive_crack=pred_result["probabilities"]["positive_crack"],
        negative_clear=pred_result["probabilities"]["negative_clear"],
    )

    response_data = AnalyzeResponse(
        id=upload_id,
        filename=filename,
        is_crack=pred_result["is_crack"],
        predicted_class=pred_result["predicted_class"],
        confidence=pred_result["confidence"],
        probabilities=probabilities,
        image_url=image_url,
    )

    # Store in memory / JSON
    inspection_repo.add(response_data.model_dump())

    return response_data
