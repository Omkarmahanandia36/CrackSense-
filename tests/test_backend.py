"""Integration and unit tests for Phase 3 FastAPI backend endpoints."""

import io
from pathlib import Path
import pytest
from PIL import Image
from httpx import AsyncClient, ASGITransport

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.services.storage import inspection_repo


def make_dummy_jpeg(color: tuple = (128, 128, 128), size: tuple = (227, 227)) -> bytes:
    """Helper to generate valid JPEG image bytes in memory."""
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_health_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Test root /health
        res1 = await client.get("/health")
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["status"] == "healthy"
        assert data1["app_name"] == settings.APP_NAME
        assert "device" in data1
        assert "model_loaded" in data1

        # Test versioned /api/v1/health
        res2 = await client.get("/api/v1/health")
        assert res2.status_code == 200
        assert res2.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_analyze_validation_empty_file():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        files = {"file": ("empty.jpg", b"", "image/jpeg")}
        res = await client.post("/analyze", files=files)
        assert res.status_code == 400
        assert "empty" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_analyze_validation_invalid_extension():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        files = {"file": ("report.pdf", b"fake pdf bytes", "application/pdf")}
        res = await client.post("/analyze", files=files)
        assert res.status_code == 400
        assert "unsupported file format" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_analyze_validation_corrupted_image():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        files = {"file": ("corrupt.jpg", b"not-a-valid-image-stream", "image/jpeg")}
        res = await client.post("/analyze", files=files)
        assert res.status_code == 400
        assert "corrupted" in res.json()["detail"].lower() or "invalid" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_analyze_successful_inference():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        img_bytes = make_dummy_jpeg()
        files = {"file": ("sample_concrete.jpg", img_bytes, "image/jpeg")}
        res = await client.post("/analyze", files=files)

        assert res.status_code == 201
        data = res.json()

        assert "id" in data
        assert data["filename"] == "sample_concrete.jpg"
        assert "is_crack" in data
        assert isinstance(data["is_crack"], bool)
        assert "confidence" in data
        assert 0.0 <= data["confidence"] <= 1.0
        assert "probabilities" in data
        assert "positive_crack" in data["probabilities"]
        assert "negative_clear" in data["probabilities"]
        assert "image_url" in data
        assert data["image_url"].startswith("/storage/uploads/")

        # Verify image file was physically written to disk
        saved_filename = data["image_url"].split("/")[-1]
        saved_path = Path(settings.UPLOAD_DIRECTORY) / saved_filename
        assert saved_path.exists()
        assert saved_path.stat().st_size > 0

        # Verify in-memory repository recorded the result
        record = inspection_repo.get(data["id"])
        assert record is not None
        assert record["filename"] == "sample_concrete.jpg"
