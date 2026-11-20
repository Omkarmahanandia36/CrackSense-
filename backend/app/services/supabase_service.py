"""Supabase Cloud Database & Storage Client Integration for CrackSense AI."""

import os
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

_supabase_client = None


def get_supabase():
    """Lazy-load and return the Supabase client if configured."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    url = settings.SUPABASE_URL or os.getenv("SUPABASE_URL", "")
    key = (
        settings.SUPABASE_SERVICE_ROLE_KEY
        or settings.SUPABASE_KEY
        or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        or os.getenv("SUPABASE_KEY", "")
    )

    if not url or not key:
        logger.debug("Supabase credentials not configured in settings or environment.")
        return None

    try:
        from supabase import create_client, Client
        _supabase_client = create_client(url, key)
        logger.info(f"Connected to Supabase project at {url}")
        return _supabase_client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        return None


def upload_image_to_supabase(
    file_bytes: bytes,
    filename: str,
    bucket_name: Optional[str] = None,
    content_type: str = "image/jpeg",
) -> Optional[str]:
    """Upload an image to Supabase Storage and return its public URL."""
    client = get_supabase()
    if not client:
        return None

    bucket = bucket_name or settings.SUPABASE_STORAGE_BUCKET
    try:
        # Check or create bucket if needed
        res = client.storage.from_(bucket).upload(
            path=filename,
            file=file_bytes,
            file_options={"content-type": content_type, "upsert": "true"},
        )
        # Get public url
        public_url = client.storage.from_(bucket).get_public_url(filename)
        logger.info(f"Uploaded {filename} to Supabase storage: {public_url}")
        return public_url
    except Exception as e:
        logger.warning(f"Could not upload {filename} to Supabase storage: {e}")
        return None


def record_inspection_in_supabase(inspection_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Save inspection record and detection boxes to Supabase relational tables."""
    client = get_supabase()
    if not client:
        return None

    try:
        # 1. Insert into public.inspections
        payload = {
            "id": str(inspection_data.get("id")),
            "filename": inspection_data.get("filename", "unknown.jpg"),
            "image_url": inspection_data.get("image_url", ""),
            "annotated_image_url": inspection_data.get("annotated_image_url"),
            "mask_png_base64": inspection_data.get("mask_png_base64"),
            "verdict": inspection_data.get("verdict", "no_crack"),
            "confidence": float(inspection_data.get("confidence", 0.0)),
            "box_count": int(inspection_data.get("box_count", len(inspection_data.get("detections", [])))),
            "image_width": int(inspection_data.get("image_width", 0)),
            "image_height": int(inspection_data.get("image_height", 0)),
            "detections": inspection_data.get("detections", []),
            "metadata": inspection_data.get("metadata", {}),
        }

        response = client.table("inspections").insert(payload).execute()
        created_records = response.data

        # 2. Insert normalized detection_boxes if present
        detections = inspection_data.get("detections", [])
        if detections and created_records:
            boxes_payload = []
            for idx, d in enumerate(detections):
                bbox = d.get("bbox", [0, 0, 0, 0])
                boxes_payload.append({
                    "inspection_id": payload["id"],
                    "box_index": idx,
                    "x": float(bbox[0]),
                    "y": float(bbox[1]),
                    "width": float(bbox[2]),
                    "height": float(bbox[3]),
                    "confidence": float(d.get("confidence", 0.0)),
                    "label": str(d.get("label", "crack")),
                })
            client.table("detection_boxes").insert(boxes_payload).execute()

        logger.info(f"Persisted inspection {payload['id']} to Supabase database.")
        return created_records[0] if created_records else None
    except Exception as e:
        logger.warning(f"Failed to record inspection in Supabase: {e}")
        return None


def fetch_inspections_from_supabase(limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieve recent inspections from Supabase."""
    client = get_supabase()
    if not client:
        return []

    try:
        response = (
            client.table("inspections")
            .select("*, detection_boxes(*)")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return response.data or []
    except Exception as e:
        logger.warning(f"Failed to fetch inspections from Supabase: {e}")
        return []
