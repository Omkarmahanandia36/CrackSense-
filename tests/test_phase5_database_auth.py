"""Comprehensive Pytest test suite for Phase 5:
1. User registration & validation (duplicate handling, password hashing)
2. JWT authentication & profile access (/auth/login, /auth/me)
3. Relational database persistence: inspections, predictions, models
4. Inspection history endpoints: list, get by ID, delete with cascade
"""

import io
import pytest
from PIL import Image
from httpx import AsyncClient, ASGITransport

from backend.app.main import app
from backend.app.core.database import init_db
from backend.app.core.config import settings


def make_test_jpeg(color: tuple = (100, 100, 100), size: tuple = (227, 227)) -> bytes:
    """Helper to generate valid JPEG image bytes in memory."""
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_auth_registration_and_login_flow():
    """Verify user registration, duplicate rejection, and JWT login authentication."""
    await init_db()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        test_email = "inspector_ph5@university.edu"
        test_pass = "SecurePass123!"

        # 1. Register new user
        reg_payload = {
            "email": test_email,
            "password": test_pass,
            "full_name": "Test Senior Inspector",
        }
        reg_res = await client.post("/auth/register", json=reg_payload)
        # Handle case where user already exists from prior test runs
        if reg_res.status_code == 400:
            assert "already exists" in reg_res.json()["detail"].lower()
        else:
            assert reg_res.status_code == 201
            reg_data = reg_res.json()
            assert reg_data["email"] == test_email
            assert reg_data["full_name"] == "Test Senior Inspector"
            assert "hashed_password" not in reg_data  # Password hash must not leak

        # 2. Duplicate registration attempt must fail
        dup_res = await client.post("/auth/register", json=reg_payload)
        assert dup_res.status_code == 400
        assert "already exists" in dup_res.json()["detail"].lower()

        # 3. Login with wrong password must return 401
        bad_login = await client.post("/auth/login", json={"email": test_email, "password": "WrongPassword"})
        assert bad_login.status_code == 401

        # 4. Login with correct credentials returns JWT token
        login_res = await client.post("/auth/login", json={"email": test_email, "password": test_pass})
        assert login_res.status_code == 200
        login_data = login_res.json()
        assert "access_token" in login_data
        assert login_data["token_type"] == "bearer"
        token = login_data["access_token"]

        # 5. Access /auth/me with Bearer token
        me_res = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["email"] == test_email

        # 6. Access /auth/me without token fails with 401
        no_auth = await client.get("/auth/me")
        assert no_auth.status_code == 401


@pytest.mark.asyncio
async def test_analyze_persists_to_database_and_history():
    """Verify that analyzing an image creates relational DB records and appears in /inspections."""
    await init_db()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Login to get an authenticated user token
        test_email = "db_tester@university.edu"
        test_pass = "DbTestPass456!"
        await client.post("/auth/register", json={"email": test_email, "password": test_pass, "full_name": "DB Tester"})
        login_res = await client.post("/auth/login", json={"email": test_email, "password": test_pass})
        token = login_res.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}"}

        # 2. Upload an image for analysis
        img_bytes = make_test_jpeg()
        files = {"file": ("concrete_test_beam.jpg", img_bytes, "image/jpeg")}
        analyze_res = await client.post("/analyze", files=files, headers=auth_headers)
        assert analyze_res.status_code == 201
        analyze_data = analyze_res.json()

        assert "id" in analyze_data
        assert analyze_data["filename"] == "concrete_test_beam.jpg"
        assert "is_crack" in analyze_data
        assert "confidence" in analyze_data

        # 3. Fetch history list via /inspections
        list_res = await client.get("/inspections?limit=50", headers=auth_headers)
        assert list_res.status_code == 200
        history_items = list_res.json()
        assert isinstance(history_items, list)
        assert len(history_items) > 0

        # Find our uploaded item
        matching = [item for item in history_items if item["uuid"] == analyze_data["id"]]
        assert len(matching) == 1
        record = matching[0]
        db_record_id = record["id"]
        assert record["filename"] == "concrete_test_beam.jpg"
        assert record["is_crack"] == analyze_data["is_crack"]

        # 4. Fetch detail by ID via /inspections/{id}
        detail_res = await client.get(f"/inspections/{db_record_id}", headers=auth_headers)
        assert detail_res.status_code == 200
        detail_data = detail_res.json()
        assert detail_data["id"] == db_record_id
        assert detail_data["uuid"] == analyze_data["id"]
        assert len(detail_data["predictions"]) >= 1
        assert detail_data["predictions"][0]["is_crack"] == analyze_data["is_crack"]

        # 5. Delete inspection record via /inspections/{id}
        del_res = await client.delete(f"/inspections/{db_record_id}", headers=auth_headers)
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "deleted"

        # 6. Verify inspection no longer exists (404)
        get_deleted = await client.get(f"/inspections/{db_record_id}", headers=auth_headers)
        assert get_deleted.status_code == 404
