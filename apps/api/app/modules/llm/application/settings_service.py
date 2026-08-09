"""LLM 设置用例层：路由层与 infra 之间的唯一通道。

依赖方向：routes → 本模块 → domain / 注入的存储适配器。
本模块不 import infra 的任何符号；env 默认值由装配点以 LLMDefaults 注入，
落盘读写由 UserLLMSettingsStore 协议隔离（实现位于 infra）。
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from app.modules.llm.domain.settings import (
    VENDOR_PRESETS,
    LLMProviderSettings,
    LLMRuntimeSettings,
    mask_api_key,
)

__all__ = [
    "LLMDefaults",
    "LLMProviderSettings",
    "LLMRuntimeSettings",
    "UserLLMSettingsStore",
    "VENDOR_PRESETS",
    "mask_api_key",
    "merge_effective_config",
    "merge_provider",
]


@dataclass(frozen=True)
class LLMDefaults:
    """env / 静态配置快照（由装配点从 LLMConfig 转换而来，本层不感知来源）。"""

    api_key: str = ""
    base_url: str = ""
    model: str = ""
    embedding_api_key: str = ""
    embedding_base_url: str = ""
    embedding_model: str = ""


class UserLLMSettingsStore(Protocol):
    """用户运行时设置的持久化端口。"""

    def load(self, user_id: str) -> LLMRuntimeSettings | None: ...

    def save(self, user_id: str, settings: LLMRuntimeSettings) -> None: ...


def merge_provider(
    existing: LLMProviderSettings,
    api_key: str | None,
    vendor: str = "",
    base_url: str = "",
    model: str = "",
) -> LLMProviderSettings:
    """合并单个提供方的页面输入与既有配置（api_key 为 None 时保留原值）。"""
    return LLMProviderSettings(
        vendor=vendor or existing.vendor or "custom",
        api_key=existing.api_key if api_key is None else api_key,
        base_url=base_url or existing.base_url,
        model=model or existing.model,
    )


def merge_effective_config(
    defaults: LLMDefaults,
    runtime: LLMRuntimeSettings | None,
) -> LLMDefaults:
    """env 默认值 ⊕ 用户运行时设置 → 每次调用生效的配置快照。

    运行时仅在其字段非空时覆盖 env；api_key 为空视为未配置（回落 mock）。
    """
    chat = runtime.chat if runtime else None
    embedding = runtime.embedding if runtime else None

    def _pick(provider: LLMProviderSettings | None, field: str, default: str) -> str:
        if provider is None:
            return default
        return getattr(provider, field, "") or default

    return LLMDefaults(
        api_key=_pick(chat, "api_key", defaults.api_key),
        base_url=_pick(chat, "base_url", defaults.base_url),
        model=_pick(chat, "model", defaults.model),
        embedding_api_key=_pick(embedding, "api_key", defaults.embedding_api_key),
        embedding_base_url=_pick(embedding, "base_url", defaults.embedding_base_url),
        embedding_model=_pick(embedding, "model", defaults.embedding_model),
    )