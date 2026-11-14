"""Unit and integration tests for Phase 6 YOLO crack localization."""

import io
from pathlib import Path
import pytest
from PIL import Image, ImageDraw
from httpx import AsyncClient, ASGITransport

from backend.app.main import app
from backend.app.core.database import init_db
from ai.detection.prepare_yolo_dataset import convert_voc_bbox_to_yolo
from ai.detection.predict import predict_crack_boxes, render_bounding_boxes


def make_synthetic_cracked_image(size: tuple = (320, 320)) -> Image.Image:
    """Create concrete-like image with a drawn crack."""
    img = Image.new("RGB", size, color=(140, 140, 140))
    draw = ImageDraw.Draw(img)
    # Draw prominent dark crack trajectory
    draw.line([(40, 40), (80, 100), (150, 140), (220, 260)], fill=(30, 30, 30), width=4)
    return img


def test_yolo_bbox_normalization():
    """Verify Pascal VOC to YOLO bbox format conversion and [0, 1] normalization."""
    img_size = (640, 480)
    voc_box = (100.0, 300.0, 80.0, 240.0)  # xmin, xmax, ymin, ymax

    x_c, y_c, w, h = convert_voc_bbox_to_yolo(img_size, voc_box)

    assert 0.0 <= x_c <= 1.0
    assert 0.0 <= y_c <= 1.0
    assert 0.0 <= w <= 1.0
    assert 0.0 <= h <= 1.0

    # Expected values
    expected_xc = round(((100 + 300) / 2.0) / 640.0, 6)
    expected_yc = round(((80 + 240) / 2.0) / 480.0, 6)
    expected_w = round((300 - 100) / 640.0, 6)
    expected_h = round((240 - 80) / 480.0, 6)

    assert x_c == expected_xc
    assert y_c == expected_yc
    assert w == expected_w
    assert h == expected_h


def test_yolo_predict_output_structure():
    """Verify predict_crack_boxes returns proper structure and bounding boxes."""
    img = make_synthetic_cracked_image()
    result = predict_crack_boxes(img)

    assert "boxes" in result
    assert "box_count" in result
    assert "crack_detected" in result
    assert "annotated_image" in result

    assert isinstance(result["boxes"], list)
    assert isinstance(result["annotated_image"], Image.Image)

    for b in result["boxes"]:
        assert "x1" in b
        assert "y1" in b
        assert "x2" in b
        assert "y2" in b
        assert "confidence" in b
        assert "label" in b
        assert b["x1"] <= b["x2"]
        assert b["y1"] <= b["y2"]
        assert 0.0 <= b["confidence"] <= 1.0


@pytest.mark.asyncio
async def test_backend_analyze_includes_yolo_boxes():
    """Verify FastAPI /analyze endpoint returns localized YOLO boxes and annotated image URL."""
    await init_db()

    img = make_synthetic_cracked_image()
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    img_bytes = buf.getvalue()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        files = {"file": ("crack_test_sample.jpg", img_bytes, "image/jpeg")}
        res = await client.post("/analyze", files=files)

        assert res.status_code == 201
        data = res.json()

        assert "id" in data
        assert "filename" in data
        assert "boxes" in data
        assert isinstance(data["boxes"], list)
        assert "annotated_image_url" in data

        # Check annotated image URL structure if boxes were localized
        if data["boxes"]:
            assert data["annotated_image_url"] is not None
            assert data["annotated_image_url"].startswith("/storage/uploads/")
            for box in data["boxes"]:
                assert "x1" in box
                assert "y1" in box
                assert "x2" in box
                assert "y2" in box
                assert "confidence" in box
