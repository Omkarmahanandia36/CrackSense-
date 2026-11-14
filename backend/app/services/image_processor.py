"""Image file management and storage operations."""

import os
import uuid
from pathlib import Path
from typing import Tuple
from PIL import Image

from backend.app.core.config import settings


class ImageProcessorService:
    """Manages file storage, saving original images and annotated overlays."""

    def __init__(self, upload_dir: str = settings.UPLOAD_DIRECTORY):
        self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def save_upload(self, pil_image: Image.Image, original_filename: str) -> Tuple[str, str, str]:
        """Save uploaded image to disk with unique UUID filename.
        
        Returns:
            (unique_id, absolute_path, relative_filename)
        """
        file_uuid = str(uuid.uuid4())
        ext = original_filename.rsplit(".", 1)[-1].lower() if "." in original_filename else "jpg"
        if ext not in ["jpg", "jpeg", "png", "bmp", "webp"]:
            ext = "jpg"

        saved_filename = f"{file_uuid}_orig.{ext}"
        saved_path = self.upload_dir / saved_filename
        pil_image.save(saved_path)

        return file_uuid, str(saved_path), saved_filename

    def save_overlay(self, overlay_image: Image.Image, file_uuid: str) -> Tuple[str, str]:
        """Save annotated visual comparison overlay to disk.
        
        Returns:
            (absolute_path, relative_filename)
        """
        overlay_filename = f"{file_uuid}_overlay.jpg"
        overlay_path = self.upload_dir / overlay_filename
        overlay_image.save(overlay_path, quality=92)
        return str(overlay_path), overlay_filename


image_processor = ImageProcessorService()
