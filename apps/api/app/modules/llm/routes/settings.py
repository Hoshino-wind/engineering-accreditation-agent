"""LLM 设置接口：页面可配置的模型 / API Key（覆盖 .env，运行时生效）。

- GET  /api/v1/settings/llm        读取当前配置（api_key 脱敏）+ 厂商预设 + 是否已配置
- PUT  /api/v1/settings/llm        保存配置（每位用户保存自己的，互不可见）
- POST /api/v1/settings/llm/test   用「未落库」的配置做连通性测试（发送一次 chat/completions）
- POST /api/v1/settings/llm/models 用当前 key 读取该厂商可用模型列表（OpenAI 兼容 /models）

api_key 语义（PUT / test / models）：
- None  → 保留原值（前端未改动时传此值，避免明文回传）
- ""    → 清空
- 非空  → 覆盖
"""

from collections.abc import Callable
from typing import Annotated, Any

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.modules.auth.application.deps import get_current_user_factory
from app.modules.auth.application.ports import AuthenticatedUser
from app.modules.llm.application.settings_service import (
    VENDOR_PRESETS,
    LLMDefaults,
    LLMProviderSettings,
    LLMRuntimeSettings,
    UserLLMSettingsStore,
    mask_api_key,
    merge_effective_config,
    merge_provider,
)


# ── 请求 / 响应模型 ──────────────────────────────────────
class ProviderInput(BaseModel):
    vendor: str = "custom"
    api_key: str | None = None  # None=保留原值；""=清空；非空=覆盖
    base_url: str = ""
    model: str = ""


class SettingsUpdateRequest(BaseModel):
    chat: ProviderInput
    embedding: ProviderInput


class ProviderPublic(BaseModel):
    vendor: str
    api_key_set: bool
    api_key_masked: str | None
    base_url: str
    model: str


class SettingsResponse(BaseModel):
    chat: ProviderPublic
    embedding: ProviderPublic
    is_configured: bool
    vendors: dict[str, dict[str, Any]]


class TestRequest(BaseModel):
    chat: ProviderInput
    embedding: ProviderInput | None = None


class TestResponse(BaseModel):
    ok: bool
    status: int | None = None
    model: str | None = None
    error: str | None = None


class ModelsResponse(BaseModel):
    ok: bool
    models: list[str] = []
    error: str | None = None


def _provider_public(provider: LLMProviderSettings, effective_key: str) -> ProviderPublic:
    return ProviderPublic(
        vendor=provider.vendor or "custom",
        api_key_set=bool(effective_key),
        api_key_masked=mask_api_key(effective_key),
        base_url=provider.base_url,
        model=provider.model,
    )


def _build_response(store: UserLLMSettingsStore, defaults: LLMDefaults, user_id: str) -> SettingsResponse:
    """组装 GET 响应：取该用户自己的运行时配置，回落到 env 默认值。"""
    runtime = store.load(user_id)
    effective = merge_effective_config(defaults, runtime)

    chat_provider = runtime.chat if runtime else LLMProviderSettings()
    emb_provider = runtime.embedding if runtime else LLMProviderSettings()

    # 运行时未设置 vendor / url / model 时，用 env 默认值补足，方便前端预填
    if not chat_provider.base_url:
        chat_provider.base_url = effective.base_url
    if not chat_provider.model:
        chat_provider.model = effective.model
    if not emb_provider.base_url:
        emb_provider.base_url = effective.embedding_base_url
    if not emb_provider.model:
        emb_provider.model = effective.embedding_model

    chat_public = _provider_public(chat_provider, effective.api_key)
    emb_public = _provider_public(emb_provider, effective.embedding_api_key)

    return SettingsResponse(
        chat=chat_public,
        embedding=emb_public,
        is_configured=effective.api_key != "",
        vendors=VENDOR_PRESETS,
    )


def _merge_provider(
    existing: LLMProviderSettings,
    incoming: ProviderInput,
) -> LLMProviderSettings:
    """按语义合并：api_key 为 None 时保留原值。"""
    return merge_provider(
        existing,
        api_key=incoming.api_key,
        vendor=incoming.vendor,
        base_url=incoming.base_url,
        model=incoming.model,
    )


def _resolve_provider(
    field: ProviderInput,
    fallback: LLMProviderSettings | None,
    env_key: str,
    env_url: str,
    env_model: str,
) -> tuple[str, str, str]:
    """按语义解析单个提供方的有效 key / base_url / model。

    api_key 为 None 或空时回落到运行时配置；再回落到 env 默认值。
    用于 test / models 这类「未落库」调用，避免明文回传、又能即时用新填的 key。
    """
    key = field.api_key if (field.api_key not in (None, "")) else (fallback.api_key if fallback else "")
    key = key or env_key
    base_url = field.base_url or (fallback.base_url if fallback else "") or env_url
    model = field.model or (fallback.model if fallback else "") or env_model
    return key, base_url, model


async def _fetch_available_models(base_url: str, api_key: str, vendor: str) -> list[str]:
    """调用 OpenAI 兼容的 /models 接口（Ollama 用原生 /api/tags）读取可用模型。"""
    base = base_url.rstrip("/")
    # Ollama 原生接口返回 {"models":[{"name":...}]}，其余用 OpenAI 兼容 /models
    models_url = (
        base.replace("/v1", "") + "/api/tags" if vendor == "ollama" else base + "/models"
    )

    headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.get(models_url, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    if isinstance(data, dict) and isinstance(data.get("data"), list):
        return [m.get("id") for m in data["data"] if m.get("id")]
    if isinstance(data, dict) and isinstance(data.get("models"), list):
        return [m.get("name") for m in data["models"] if m.get("name")]
    return []


def create_settings_router(
    provide_user_repository: Callable[..., Any],
    provide_settings: Callable[..., Any],
    provide_llm_store: Callable[[], UserLLMSettingsStore],
    provide_llm_defaults: Callable[[], LLMDefaults],
) -> APIRouter:
    router = APIRouter(prefix="/settings", tags=["settings"])

    # 必须先在局部变量中构造依赖，再用于 Depends。
    # 直接 Depends(参数名) 会被当成未绑定的形参，导致 FastAPI 把用户当成查询参数。
    get_current_user = get_current_user_factory(
        provide_user_repository, provide_settings
    )

    @router.get("/llm", response_model=SettingsResponse)
    async def get_llm_settings(
        _current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    ) -> SettingsResponse:
        return _build_response(
            provide_llm_store(), provide_llm_defaults(), _current_user.id
        )

    @router.put("/llm", response_model=SettingsResponse)
    async def update_llm_settings(
        body: SettingsUpdateRequest,
        current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    ) -> SettingsResponse:
        store = provide_llm_store()
        # 每位用户仅能保存「自己」的配置，互不可见（不再限制 admin）。
        runtime = store.load(current_user.id) or LLMRuntimeSettings()
        runtime.chat = _merge_provider(runtime.chat, body.chat)
        runtime.embedding = _merge_provider(runtime.embedding, body.embedding)
        store.save(current_user.id, runtime)
        return _build_response(store, provide_llm_defaults(), current_user.id)

    @router.post("/llm/test", response_model=TestResponse)
    async def test_connection(
        body: TestRequest,
        _current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    ) -> TestResponse:
        store = provide_llm_store()
        runtime = store.load(_current_user.id)
        defaults = provide_llm_defaults()

        chat_key, chat_url, chat_model = _resolve_provider(
            body.chat, runtime.chat if runtime else None,
            defaults.api_key, defaults.base_url, defaults.model,
        )

        if not chat_key or not chat_url or not chat_model:
            return TestResponse(
                ok=False, error="请先填写 API Key、Base URL 与模型名称"
            )

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(
                    f"{chat_url.rstrip('/')}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {chat_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": chat_model,
                        "messages": [{"role": "user", "content": "ping"}],
                        "max_tokens": 5,
                        "temperature": 0,
                    },
                )
                if resp.status_code == 200:
                    return TestResponse(ok=True, status=resp.status_code, model=chat_model)
                return TestResponse(
                    ok=False,
                    status=resp.status_code,
                    error=(resp.text or "")[:500],
                )
        except Exception as exc:  # noqa: BLE001
            return TestResponse(ok=False, error=str(exc)[:500])

    @router.post("/llm/models", response_model=ModelsResponse)
    async def list_models(
        body: ProviderInput,
        _current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    ) -> ModelsResponse:
        """用当前（未落库）配置读取该厂商可用模型列表。

        用于前端「读取模型」按钮：用户选好厂商、填好 Key 后，一键拉取
        此 key 实际可用的模型，避免手动猜模型名。
        """
        store = provide_llm_store()
        runtime = store.load(_current_user.id)
        defaults = provide_llm_defaults()
        key, base_url, _ = _resolve_provider(
            body, runtime.chat if runtime else None,
            defaults.api_key, defaults.base_url, defaults.model,
        )

        if not key or not base_url:
            return ModelsResponse(ok=False, error="请先填写 API Key 与 Base URL")

        try:
            models = await _fetch_available_models(base_url, key, body.vendor)
            if not models:
                return ModelsResponse(
                    ok=False,
                    error="未从接口获取到模型列表（可能该厂商不支持 /models 或 Key 无权限）",
                )
            return ModelsResponse(ok=True, models=models)
        except httpx.HTTPStatusError as exc:
            detail = (exc.response.text or "")[:300]
            return ModelsResponse(
                ok=False,
                error=f"HTTP {exc.response.status_code}：{detail}",
            )
        except Exception as exc:  # noqa: BLE001
            return ModelsResponse(ok=False, error=str(exc)[:300])

    return router
