"""Integration tests for inspection analysis, history, and PDF report generation."""

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
        # 1. Check models status endpoint
        models_resp = await client.get("/api/v1/models")
        assert models_resp.status_code == 200
        models_data = models_resp.json()
        assert "models" in models_data
        assert "resnet_classifier" in models_data["models"]

        # 2. Upload image for analysis
        image_bytes = create_sample_concrete_image()
        files = {"file": ("concrete_sample.jpg", image_bytes, "image/jpeg")}
        analyze_resp = await client.post("/api/v1/inspections/analyze", files=files)
        assert analyze_resp.status_code == 201
        analysis = analyze_resp.json()

        assert "id" in analysis
        assert "uuid" in analysis
        assert "is_crack" in analysis
        assert "confidence" in analysis
        assert "severity" in analysis
        assert "image_url" in analysis
        assert "overlay_url" in analysis
        record_id = analysis["id"]

        # 3. Retrieve inspection by ID
        get_resp = await client.get(f"/api/v1/inspections/{record_id}")
        assert get_resp.status_code == 200
        get_data = get_resp.json()
        assert get_data["id"] == record_id
        assert get_data["filename"] == "concrete_sample.jpg"

        # 4. List inspections
        list_resp = await client.get("/api/v1/inspections?limit=10")
        assert list_resp.status_code == 200
        list_data = list_resp.json()
        assert len(list_data) >= 1
        assert any(item["id"] == record_id for item in list_data)

        # 5. Download generated PDF report
        report_resp = await client.get(f"/api/v1/inspections/{record_id}/report")
        assert report_resp.status_code == 200
        assert report_resp.headers["content-type"] == "application/pdf"
        assert len(report_resp.content) > 1000  # Non-trivial PDF generated
