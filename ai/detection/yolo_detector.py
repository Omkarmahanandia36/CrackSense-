"""YOLO-based crack localization module (Stage 2) with computer vision contour fallback."""

import os
import logging
from typing import List, Dict, Any, Optional
import numpy as np
import cv2
from PIL import Image

logger = logging.getLogger(__name__)


class YOLOCrackDetector:
    """YOLO detector for crack localization with computer vision fallback."""

    def __init__(self, model_path: Optional[str] = None, conf_threshold: float = 0.25):
        self.conf_threshold = conf_threshold
        self.model = None
        self.is_custom_model_loaded = False

        if model_path and os.path.exists(model_path):
            try:
                from ultralytics import YOLO
                self.model = YOLO(model_path)
                self.is_custom_model_loaded = True
                logger.info(f"Loaded YOLO crack detection model from {model_path}")
            except Exception as e:
                logger.warning(f"Could not load YOLO model from {model_path}: {e}. Fallback active.")

    def detect(self, pil_image: Image.Image, is_crack_hint: bool = True) -> List[Dict[str, Any]]:
        """Run crack localization. Returns list of bounding boxes."""
        if self.is_custom_model_loaded and self.model is not None:
            return self._detect_with_yolo(pil_image)
        elif is_crack_hint:
            return self._detect_with_cv_contours(pil_image)
        return []

    def _detect_with_yolo(self, pil_image: Image.Image) -> List[Dict[str, Any]]:
        results = self.model.predict(pil_image, conf=self.conf_threshold, verbose=False)
        boxes_out: List[Dict[str, Any]] = []

        for result in results:
            if result.boxes is not None:
                for box in result.boxes:
                    coords = box.xyxy[0].tolist()
                    conf = float(box.conf[0].item())
                    cls_id = int(box.cls[0].item())
                    label = self.model.names.get(cls_id, "Crack") if hasattr(self.model, "names") else "Crack"
                    boxes_out.append({
                        "x1": round(coords[0], 1),
                        "y1": round(coords[1], 1),
                        "x2": round(coords[2], 1),
                        "y2": round(coords[3], 1),
                        "confidence": round(conf, 4),
                        "label": label,
                    })
        return boxes_out

    def _detect_with_cv_contours(self, pil_image: Image.Image) -> List[Dict[str, Any]]:
        """Intelligent computer vision fallback for crack localization via morphological analysis."""
        img_np = np.array(pil_image)
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY) if len(img_np.shape) == 3 else img_np

        # Adaptive thresholding to catch dark crack lines on concrete
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        thresh = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 21, 5
        )

        # Morphological filtering to isolate elongated crack features
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        filtered = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)

        contours, _ = cv2.findContours(filtered, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        boxes_out: List[Dict[str, Any]] = []
        img_h, img_w = gray.shape

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < 50:  # Filter out fine aggregate noise
                continue
            x, y, w, h = cv2.boundingRect(cnt)
            # Check aspect ratio or size
            if (w * h) / (img_w * img_h) > 0.9:  # Filter entire border
                continue

            boxes_out.append({
                "x1": float(x),
                "y1": float(y),
                "x2": float(x + w),
                "y2": float(y + h),
                "confidence": round(min(0.70 + (area / 1000.0) * 0.15, 0.95), 4),
                "label": "Crack Region",
            })

        # Keep top 5 largest crack candidate boxes
        boxes_out.sort(key=lambda b: (b["x2"] - b["x1"]) * (b["y2"] - b["y1"]), reverse=True)
        return boxes_out[:5]
