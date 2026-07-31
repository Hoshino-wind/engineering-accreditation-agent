from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="EA_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_version: str = "0.1.0"
    environment: Literal["development", "test", "staging", "production"] = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str | None = None
    redis_url: str | None = None
    object_storage_endpoint: str | None = None
    local_data_dir: Path = Path(".local-data")
    max_upload_bytes: int = 50 * 1024 * 1024
    virus_scan_mode: Literal["auto", "builtin", "clamav"] = "auto"
    clamav_command: str = "clamscan"
    deepseek_api_base_url: str = "https://api.deepseek.com"
    deepseek_api_key: SecretStr | None = None
    deepseek_model: str = "deepseek-v4-flash"
    deepseek_ocr_base_url: str | None = None
    deepseek_ocr_api_key: SecretStr | None = None
    deepseek_ocr_model: str = "deepseek-ai/DeepSeek-OCR"
    deepseek_timeout_seconds: float = 60
    ocr_max_pdf_pages: int = 12
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])


@lru_cache
def get_settings() -> Settings:
    return Settings()
