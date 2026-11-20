"""Integration tests for inspection analysis and history lifecycle."""

import io
import pytest
from PIL import Image, ImageDraw
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.core.database import init_db
from backend.app.core.security import create_access_token


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

    token = create_access_token({"sub": "test-inspector-uuid", "id": "test-inspector-uuid"})
    auth_headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Health check
        health_resp = await client.get("/health")
        assert health_resp.status_code == 200
        assert health_resp.json()["status"] == "healthy"

        # 2. Upload image for analysis with auth
        image_bytes = create_sample_concrete_image()
        files = {"file": ("concrete_sample.jpg", image_bytes, "image/jpeg")}
        analyze_resp = await client.post("/analyze", files=files, headers=auth_headers)
        assert analyze_resp.status_code in (200, 201)
        analysis = analyze_resp.json()

        assert "id" in analysis
        assert "is_crack" in analysis
        assert "confidence" in analysis
        assert "image_url" in analysis

        # 3. List inspections with auth
        list_resp = await client.get("/inspections?limit=10", headers=auth_headers)
        assert list_resp.status_code == 200
        list_data = list_resp.json()
        assert len(list_data) >= 1
        assert any(item["filename"] == "concrete_sample.jpg" for item in list_data)

        # 4. Download PDF report
        insp_id = list_data[0]["id"]
        report_resp = await client.get(f"/inspections/{insp_id}/report", headers=auth_headers)
        assert report_resp.status_code == 200
        assert report_resp.headers["content-type"] == "application/pdf"
