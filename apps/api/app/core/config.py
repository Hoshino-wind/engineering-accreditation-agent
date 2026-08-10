from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# 仅用于开发环境的默认 JWT 密钥：非开发环境必须显式配置 EA_JWT_SECRET
_DEFAULT_JWT_SECRET = "dev-only-change-me-in-prod-2026-engineering-accreditation"


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
    object_storage_bucket: str = ""
    object_storage_access_key: str = ""
    object_storage_secret_key: SecretStr = SecretStr("")
    object_storage_region: str = "us-east-1"
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:5175",
            "http://localhost:5176",
            "http://localhost:5177",
            "http://localhost:5178",
            "http://localhost:5179",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
            "http://127.0.0.1:5175",
            "http://127.0.0.1:5176",
            "http://127.0.0.1:5177",
            "http://127.0.0.1:5178",
            "http://127.0.0.1:5179",
        ]
    )

    # ── 认证 / 用户 ─────────────────────────────────────
    jwt_secret: SecretStr = SecretStr(_DEFAULT_JWT_SECRET)
    jwt_algorithm: str = "HS256"
    jwt_access_token_ttl_minutes: int = 60 * 24 * 7  # MVP：7天免登，后续拆 refresh token
    # 公开注册开关：默认关闭。关闭时新用户只能由后台/种子账号创建，
    # 管理员与审核角色一律由后台授予，注册入口永远创建最小权限（teacher）用户。
    allow_public_registration: bool = False

    # ── LLM 配置 ────────────────────────────────────────
    llm_api_key: SecretStr = SecretStr("")
    llm_api_base_url: str = "https://api.deepseek.com/v1"
    llm_model: str = "deepseek-chat"
    llm_embedding_api_key: SecretStr = SecretStr("")
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

    @model_validator(mode="after")
    def _enforce_production_secrets(self) -> "Settings":
        """非开发环境禁止使用默认 JWT 密钥与默认去标识化盐。"""
        if (
            self.environment != "development"
            and self.jwt_secret.get_secret_value() == _DEFAULT_JWT_SECRET
        ):
            raise ValueError(
                "EA_JWT_SECRET 必须在非开发环境显式配置（禁止使用默认开发密钥）"
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
