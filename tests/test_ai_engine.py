"""Unit tests for AI preprocessing, models, and evaluation metrics."""

import numpy as np
import torch
from PIL import Image

from ai.preprocessing.transforms import (
    validate_image,
    preprocess_for_classification,
    preprocess_for_segmentation,
    enhance_concrete_image,
    create_analysis_overlay,
)
from ai.classification.resnet_classifier import ResNetCrackClassifier
from ai.segmentation.unet_segmenter import UNetCrackSegmentation
from ai.detection.yolo_detector import YOLOCrackDetector
from ai.evaluation.metrics import compute_classification_metrics, compute_segmentation_metrics


def test_image_validation():
    # Valid synthetic RGB image
    img = Image.new("RGB", (227, 227), color=(128, 128, 128))
    import io
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    valid_bytes = buf.getvalue()

    is_valid, err, pil_img = validate_image(valid_bytes, "test.jpg")
    assert is_valid is True
    assert err is None
    assert pil_img is not None
    assert pil_img.size == (227, 227)

    # Empty bytes validation
    is_valid, err, _ = validate_image(b"")
    assert is_valid is False


def test_preprocessing_transforms():
    img = Image.new("RGB", (300, 300), color=(150, 150, 150))
    tensor = preprocess_for_classification(img)
    assert tensor.shape == (1, 3, 227, 227)
    assert isinstance(tensor, torch.Tensor)

    seg_tensor, orig_size = preprocess_for_segmentation(img)
    assert seg_tensor.shape == (1, 3, 256, 256)
    assert orig_size == (300, 300)


def test_clahe_enhancement():
    img_np = np.full((100, 100, 3), 120, dtype=np.uint8)
    enhanced = enhance_concrete_image(img_np)
    assert enhanced.shape == (100, 100, 3)
    assert enhanced.dtype == np.uint8


def test_classifier_prediction():
    classifier = ResNetCrackClassifier(architecture="resnet18", pretrained=False)
    img = Image.new("RGB", (227, 227), color=(100, 100, 100))
    result = classifier.predict(img)

    assert "is_crack" in result
    assert "confidence" in result
    assert "predicted_class" in result
    assert result["predicted_class"] in ["Positive", "Negative"]
    assert 0.0 <= result["confidence"] <= 1.0


def test_segmenter_prediction():
    segmenter = UNetCrackSegmentation()
    img = Image.new("RGB", (200, 200), color=(120, 120, 120))
    result = segmenter.segment(img, is_crack_hint=True)

    assert "mask" in result
    assert "crack_pixel_count" in result
    assert "crack_percentage" in result
    assert "severity" in result
    assert result["severity"] in ["None", "Low", "Medium", "High"]


def test_detector_prediction():
    detector = YOLOCrackDetector()
    img = Image.new("RGB", (200, 200), color=(120, 120, 120))
    boxes = detector.detect(img, is_crack_hint=True)
    assert isinstance(boxes, list)


def test_metrics_computation():
    # Classification metrics
    y_true = np.array([1, 0, 1, 1, 0])
    y_pred = np.array([1, 0, 1, 0, 0])
    cls_metrics = compute_classification_metrics(y_true, y_pred)
    assert cls_metrics["accuracy"] == 0.8
    assert cls_metrics["f1_score"] > 0

    # Segmentation metrics
    mask_true = np.zeros((50, 50), dtype=np.uint8)
    mask_true[10:20, 10:20] = 1
    mask_pred = np.zeros((50, 50), dtype=np.uint8)
    mask_pred[10:20, 10:20] = 1

    seg_metrics = compute_segmentation_metrics(mask_true, mask_pred)
    assert seg_metrics["iou"] == 1.0
    assert seg_metrics["dice"] == 1.0
