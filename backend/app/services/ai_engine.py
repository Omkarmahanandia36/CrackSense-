"""Unified AI Engine coordinating classification, localization, and segmentation pipelines."""

import logging
from typing import Dict, Any, Tuple
from PIL import Image
import torch

from backend.app.core.config import settings
from ai.classification.resnet_classifier import ResNetCrackClassifier
from ai.detection.yolo_detector import YOLOCrackDetector
from ai.segmentation.unet_segmenter import UNetCrackSegmentation
from ai.preprocessing.transforms import create_analysis_overlay

logger = logging.getLogger(__name__)


class AIEngine:
    """Production AI inference coordinator for CrackSense AI."""

    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Initializing AI Engine on device: {self.device}")

        # Initialize Stage 1 Classifier
        self.classifier = ResNetCrackClassifier(
            architecture="resnet18",
            pretrained=False,
            weights_path=settings.RESNET_MODEL_PATH if settings.RESNET_MODEL_PATH else None,
        )

        # Initialize Stage 2 Detector
        self.detector = YOLOCrackDetector(
            model_path=settings.YOLO_MODEL_PATH if settings.YOLO_MODEL_PATH else None,
        )

        # Initialize Stage 3 Segmenter
        self.segmenter = UNetCrackSegmentation(
            weights_path=settings.UNET_MODEL_PATH if settings.UNET_MODEL_PATH else None,
        )

    def analyze(self, pil_image: Image.Image) -> Tuple[Dict[str, Any], Image.Image]:
        """Execute full multi-stage AI analysis pipeline on concrete surface image.
        
        Returns:
            (metrics_dict, visual_overlay_pil_image)
        """
        # 1. Classification (Stage 1)
        cls_result = self.classifier.predict(pil_image)
        is_crack = cls_result["is_crack"]
        confidence = cls_result["confidence"]

        # 2. Localization (Stage 2)
        boxes = self.detector.detect(pil_image, is_crack_hint=is_crack)

        # 3. Segmentation (Stage 3)
        seg_result = self.segmenter.segment(pil_image, is_crack_hint=is_crack)

        # If bounding boxes detected or segmentation shows cracks, enforce is_crack flag
        if len(boxes) > 0 or seg_result["crack_pixel_count"] > 200:
            is_crack = True
            cls_result["predicted_class"] = "Positive"
            if confidence < 0.70:
                confidence = 0.85
                cls_result["confidence"] = confidence

        # 4. Generate annotated visualization comparison overlay
        overlay_image = create_analysis_overlay(
            original_image=pil_image,
            is_crack=is_crack,
            confidence=confidence,
            boxes=boxes,
            mask=seg_result["mask"],
            save_side_by_side=True,
        )

        analysis_data = {
            "is_crack": is_crack,
            "confidence": confidence,
            "predicted_class": cls_result["predicted_class"],
            "probabilities": cls_result["probabilities"],
            "severity": seg_result["severity"],
            "crack_percentage": seg_result["crack_percentage"],
            "bounding_boxes": boxes,
        }

        return analysis_data, overlay_image

    def get_status(self) -> Dict[str, Any]:
        """Introspect AI pipeline and loaded model versions."""
        return {
            "app_name": settings.APP_NAME,
            "environment": settings.APP_ENV,
            "device": self.device,
            "cuda_available": torch.cuda.is_available(),
            "models": {
                "resnet_classifier": {
                    "architecture": self.classifier.architecture,
                    "stage": "Stage 1 (Classification)",
                    "custom_weights_loaded": bool(settings.RESNET_MODEL_PATH),
                    "status": "ready",
                },
                "yolo_detector": {
                    "model": "YOLOv8 / Morphological Contour Fallback",
                    "stage": "Stage 2 (Localization)",
                    "custom_weights_loaded": self.detector.is_custom_model_loaded,
                    "status": "ready",
                },
                "unet_segmenter": {
                    "architecture": "U-Net 4-Level Encoder/Decoder",
                    "stage": "Stage 3 (Segmentation)",
                    "custom_weights_loaded": self.segmenter.is_custom_model_loaded,
                    "status": "ready",
                },
            },
        }


# Global singleton instance
ai_engine = AIEngine()
