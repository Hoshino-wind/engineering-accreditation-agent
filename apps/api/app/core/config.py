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

    # ── 认证 / 用户 ─────────────────────────────────────
    jwt_secret: str = "dev-only-change-me-in-prod-2026-engineering-accreditation"
    jwt_algorithm: str = "HS256"
    jwt_access_token_ttl_minutes: int = 60 * 24 * 7  # MVP：7天免登，后续拆 refresh token

    # ── LLM 配置 ────────────────────────────────────────
    llm_api_key: str = ""
    llm_api_base_url: str = "https://api.deepseek.com/v1"
    llm_model: str = "deepseek-chat"
    llm_embedding_api_key: str = ""
    llm_embedding_base_url: str = "https://api.deepseek.com/v1"
    llm_embedding_model: str = "text-embedding-3-small"

    # ── RAG / 向量库配置 ────────────────────────────────
    qdrant_url: str = ""
    qdrant_collection: str = "ea_chunks"
    qdrant_dim: int = 512

    # ── M7/M8 LLM 调用附加配置 ──────────────────────────
    # LLM HTTP 调用超时（秒）
    llm_timeout_seconds: float = 60.0
    # RAG 检索服务地址（Trea 暴露的 /api/v1/rag/search）；为空则跳过 RAG 注入
    rag_search_url: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
