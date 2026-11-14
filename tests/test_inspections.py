"""Integration tests for inspection analysis and history lifecycle."""

import io
import pytest
from PIL import Image, ImageDraw
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.core.database import init_db


def create_sample_concrete_image() -> bytes:
    """Create synthetic concrete surface patch with an artificial crack line."""
    img = Image.new("RGB", (227, 227), color=(140, 140, 140))
    draw = ImageDraw.Draw(img)
    # Draw dark crack-like line across the concrete patch
    draw.line([(30, 40), (70, 90), (120, 110), (180, 180)], fill=(30, 30, 30), width=3)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_full_inspection_lifecycle():
    await init_db()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Health check
        health_resp = await client.get("/health")
        assert health_resp.status_code == 200
        assert health_resp.json()["status"] == "healthy"

        # 2. Upload image for analysis
        image_bytes = create_sample_concrete_image()
        files = {"file": ("concrete_sample.jpg", image_bytes, "image/jpeg")}
        analyze_resp = await client.post("/analyze", files=files)
        assert analyze_resp.status_code in (200, 201)
        analysis = analyze_resp.json()

        assert "id" in analysis
        assert "is_crack" in analysis
        assert "confidence" in analysis
        assert "image_url" in analysis

        # 3. List inspections
        list_resp = await client.get("/inspections?limit=10")
        assert list_resp.status_code == 200
        list_data = list_resp.json()
        assert len(list_data) >= 1
        assert any(item["filename"] == "concrete_sample.jpg" for item in list_data)
