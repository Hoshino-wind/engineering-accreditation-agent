from functools import lru_cache
from typing import Literal

from pydantic import Field
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
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])


@lru_cache
def get_settings() -> Settings:
    return Settings()
