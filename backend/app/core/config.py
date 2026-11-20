"""Application configuration loaded from .env file using pydantic-settings."""

import os
from pathlib import Path
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent


class Settings(BaseSettings):
    APP_NAME: str = "CrackSense AI"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # Database (Default: PostgreSQL via asyncpg, fallback to SQLite if postgres not active)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/cracksense_db"
    SQLITE_FALLBACK_URL: str = f"sqlite+aiosqlite:///{BASE_DIR}/cracksense.db"

    # JWT Authentication
    SECRET_KEY: str = "cracksense-super-secret-jwt-key-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Storage paths
    UPLOAD_DIRECTORY: str = str(BASE_DIR / "storage" / "uploads")
    REPORT_DIRECTORY: str = str(BASE_DIR / "storage" / "reports")
    STORAGE_JSON_PATH: str = str(BASE_DIR / "storage" / "inspections.json")

    # File Upload Constraints
    MAX_FILE_SIZE_MB: int = 15
    ALLOWED_EXTENSIONS: List[str] = ["jpg", "jpeg", "png", "bmp", "webp"]

    # Supabase Cloud Integration
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_STORAGE_BUCKET: str = "cracksense-images"

    # Trained Model Checkpoint Path
    RESNET_MODEL_PATH: str = str(BASE_DIR / "models" / "best_resnet18.pth")
    YOLO_MODEL_PATH: str = str(BASE_DIR / "models" / "best_yolo.pt")
    UNET_MODEL_PATH: str = ""

    # CORS Allowed Origins
    CORS_ORIGINS: Union[List[str], str] = ["*"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[List[str], str]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str):
            import json
            try:
                return json.loads(v)
            except Exception:
                return ["*"]
        return v

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True)
os.makedirs(settings.REPORT_DIRECTORY, exist_ok=True)
