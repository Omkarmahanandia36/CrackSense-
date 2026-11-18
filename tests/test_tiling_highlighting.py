"""Test tiled crack detection, NMS bounding-box merging, and transparent mask output."""

import base64
from io import BytesIO
import pytest
from PIL import Image
from httpx import AsyncClient, ASGITransport

from backend.app.main import app
from backend.app.services.crack_detector import detect_cracks_tiled, tile_image_generator, apply_nms


def create_sample_wall_photo(width: int = 1024, height: int = 800) -> Image.Image:
    """Generate a synthetic concrete wall photo with distinct crack lines."""
    import numpy as np
    import cv2

    # Concrete texture background (grey with slight noise)
    base = np.random.normal(160, 15, (height, width)).astype(np.uint8)
    img_bgr = cv2.cvtColor(base, cv2.COLOR_GRAY2BGR)

    # Draw dark jagged crack lines on the wall
    pts = np.array([
        [150, 100], [220, 240], [290, 310], [380, 480], [420, 600]
    ], np.int32)
    cv2.polylines(img_bgr, [pts], isClosed=False, color=(35, 35, 35), thickness=3)

    pts2 = np.array([
        [650, 200], [700, 320], [760, 450], [800, 520]
    ], np.int32)
    cv2.polylines(img_bgr, [pts2], isClosed=False, color=(40, 40, 40), thickness=2)

    return Image.fromarray(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB))


def test_tiling_generator():
    """Verify overlapping tiles cover entire large wall surface."""
    w, h = 1200, 900
    tile_size = 512
    overlap = 0.20
    tiles = tile_image_generator(w, h, tile_size=tile_size, overlap=overlap)

    assert len(tiles) >= 4
    # Ensure tiles reach the outer edges
    max_x2 = max(t[2] for t in tiles)
    max_y2 = max(t[3] for t in tiles)
    assert max_x2 == w
    assert max_y2 == h


def test_nms_suppression():
    """Verify NMS deduplicates highly overlapping bounding boxes."""
    candidate_boxes = [
        {"x1": 100.0, "y1": 100.0, "x2": 250.0, "y2": 250.0, "confidence": 0.88, "label": "Crack"},
        {"x1": 105.0, "y1": 102.0, "x2": 248.0, "y2": 252.0, "confidence": 0.82, "label": "Crack"},
        {"x1": 500.0, "y1": 500.0, "x2": 650.0, "y2": 650.0, "confidence": 0.90, "label": "Crack"},
    ]
    kept = apply_nms(candidate_boxes, iou_threshold=0.40)
    assert len(kept) == 2  # The duplicate was merged away


def test_detect_cracks_tiled_structure():
    """Verify the tiled detection output structure and mask format on sample wall photo."""
    wall_img = create_sample_wall_photo(1024, 768)
    result = detect_cracks_tiled(wall_img, conf_threshold=0.30, tile_size=512)

    assert result["image_width"] == 1024
    assert result["image_height"] == 768
    assert result["verdict"] in ("crack_detected", "no_crack")
    assert isinstance(result["detections"], list)
    assert isinstance(result["mask_png_base64"], str)
    assert len(result["mask_png_base64"]) > 100

    # Verify mask can be decoded as RGBA transparent PNG
    png_bytes = base64.b64decode(result["mask_png_base64"])
    mask_img = Image.open(BytesIO(png_bytes))
    assert mask_img.size == (1024, 768)
    assert mask_img.mode == "RGBA"


@pytest.mark.asyncio
async def test_backend_analyze_tiled_api():
    """Test full POST /analyze endpoint with sample dam/wall photo."""
    wall_img = create_sample_wall_photo(800, 600)
    buf = BytesIO()
    wall_img.save(buf, format="JPEG")
    buf.seek(0)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/analyze?threshold=0.30",
            files={"file": ("concrete_dam_wall.jpg", buf, "image/jpeg")},
        )

    assert response.status_code in (200, 201)
    data = response.json()

    # Required fields in response
    assert data["image_width"] == 800
    assert data["image_height"] == 600
    assert data["verdict"] in ("crack_detected", "no_crack")
    assert "detections" in data
    assert "mask_png_base64" in data
    assert "boxes" in data
    assert "confidence" in data
    assert "image_url" in data

    if data["detections"]:
        det = data["detections"][0]
        assert "id" in det
        assert "confidence" in det
        assert "bbox" in det
        assert len(det["bbox"]) == 4  # [x, y, w, h]
