"""Application configuration and environment settings."""

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

    # Database
    DATABASE_URL: str = f"sqlite+aiosqlite:///{BASE_DIR}/cracksense.db"

    # Security
    SECRET_KEY: str = "cracksense-super-secret-key-change-in-production"

    # Storage paths
    UPLOAD_DIRECTORY: str = str(BASE_DIR / "storage" / "uploads")
    REPORT_DIRECTORY: str = str(BASE_DIR / "storage" / "reports")

    # Model Weights (optional custom paths)
    RESNET_MODEL_PATH: str = ""
    YOLO_MODEL_PATH: str = ""
    UNET_MODEL_PATH: str = ""

    # CORS
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

# Ensure storage directories exist
os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True)
os.makedirs(settings.REPORT_DIRECTORY, exist_ok=True)
