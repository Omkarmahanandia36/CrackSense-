"""Hugging Face / Cloudinary compatibility endpoints for Phase 1-4 parity."""

import os
import time
import base64
import hashlib
import logging
from io import BytesIO
from typing import List, Optional
import requests
from PIL import Image
from dotenv import load_dotenv
from pydantic import BaseModel, Field

load_dotenv()
from fastapi import APIRouter, Request, Query, HTTPException, status
from ultralytics import YOLO

logger = logging.getLogger(__name__)
router = APIRouter()

# Schemas
class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float
    label: str = "crack"
    confidence: float

class PredictResponse(BaseModel):
    result: str
    confidence: float
    boxes: List[BoundingBox] = []
    mask_data: Optional[str] = None
    image_width: int
    image_height: int

class UploadSignatureResponse(BaseModel):
    timestamp: int
    signature: str
    api_key: str
    folder: str
    cloud_name: str

class PredictUrlPayload(BaseModel):
    image_url: Optional[str] = None


@router.get("/upload-signature", response_model=UploadSignatureResponse, tags=["Cloudinary"])
def get_upload_signature(
    user_id: Optional[str] = Query(default="guest"),
    folder: Optional[str] = Query(default=None),
):
    """Generate signed Cloudinary upload parameters."""
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", "eced1hkp")
    api_key = os.getenv("CLOUDINARY_API_KEY", "932247965476644")
    api_secret = os.getenv("CLOUDINARY_API_SECRET", "")

    if not api_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="CLOUDINARY_API_SECRET environment variable not configured.",
        )

    safe_user_id = "".join(c for c in user_id if c.isalnum() or c in "-_") or "guest"
    target_folder = folder if folder else f"cracksense/{safe_user_id}"
    timestamp = int(time.time())

    params_to_sign = f"folder={target_folder}&timestamp={timestamp}"
    to_sign = f"{params_to_sign}{api_secret}"
    signature = hashlib.sha1(to_sign.encode("utf-8")).hexdigest()

    return {
        "timestamp": timestamp,
        "signature": signature,
        "api_key": api_key,
        "folder": target_folder,
        "cloud_name": cloud_name,
    }


@router.post("/predict", response_model=PredictResponse, tags=["Analysis"])
async def predict_endpoint(
    request: Request,
    image_url: Optional[str] = Query(default=None),
    threshold: float = Query(default=0.30, ge=0.05, le=0.95),
):
    """Predict crack presence and coordinates from image URL or multipart file."""
    target_url = image_url
    raw_bytes: Optional[bytes] = None

    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body = await request.json()
            if isinstance(body, dict):
                target_url = body.get("image_url") or target_url
        except Exception:
            pass
    elif "multipart/form-data" in content_type:
        form = await request.form()
        uploaded = form.get("file")
        if uploaded and hasattr(uploaded, "read"):
            raw_bytes = await uploaded.read()
        target_url = form.get("image_url") or target_url

    if target_url:
        try:
            resp = requests.get(target_url, timeout=20)
            if resp.status_code != 200:
                raise HTTPException(status_code=400, detail=f"Image fetch failed: HTTP {resp.status_code}")
            raw_bytes = resp.content
        except requests.RequestException as e:
            raise HTTPException(status_code=400, detail=f"Failed to download image URL: {e}")
    elif raw_bytes is None:
        raise HTTPException(status_code=400, detail="Provide 'image_url' in JSON/query or multipart 'file'.")

    try:
        img = Image.open(BytesIO(raw_bytes)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image format: {e}")

    # Resize large images (max 1600px)
    if img.width > 1600 or img.height > 1600:
        img.thumbnail((1600, 1600), Image.Resampling.LANCZOS)

    img_w, img_h = img.size

    # Load YOLO from models directory
    from ai.detection.predict import get_yolo_model
    yolo_model = get_yolo_model()

    boxes: List[BoundingBox] = []
    max_conf: float = 0.0

    if yolo_model:
        results = yolo_model.predict(source=img, conf=threshold, verbose=False)
        for r in results:
            for b in r.boxes:
                coords = b.xyxy[0].tolist()
                conf = float(b.conf[0].item())
                x1, y1, x2, y2 = coords
                if conf > max_conf:
                    max_conf = conf
                boxes.append(
                    BoundingBox(
                        x=round(x1, 2),
                        y=round(y1, 2),
                        width=round(max(1.0, x2 - x1), 2),
                        height=round(max(1.0, y2 - y1), 2),
                        label="crack",
                        confidence=round(conf, 4),
                    )
                )

    has_cracks = len(boxes) > 0
    return PredictResponse(
        result="crack" if has_cracks else "no crack",
        confidence=round(max_conf if has_cracks else 0.95, 4),
        boxes=boxes,
        mask_data=None,
        image_width=img_w,
        image_height=img_h,
    )
