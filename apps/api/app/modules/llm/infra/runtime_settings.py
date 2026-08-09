"""LLM 运行时配置（页面可配置，落盘 JSON，覆盖 .env）。

此前 API Key 只能写在后端 .env 里，重启才生效。
现在改为：后端读取持久化的 llm_settings.json，优先级高于 .env；
前端「模型设置」页面可在运行时修改并即时生效，无需重启服务。

安全说明：
- 该 JSON 与业务数据同目录（apps/api/data/），已被 .gitignore 忽略，不会进版本库。
- GET 接口对 api_key 做脱敏（仅返回掩码 + 是否已配置），前端保存时通过
  "传 None=保留原值 / 传空串=清空 / 传非空=覆盖" 的语义避免明文回传。
- 该配置为单租户全局配置（与现有内存存储架构一致），仅登录用户可读写，
  写入额外要求 admin 角色。
"""

from __future__ import annotations

import json
import threading
import time
from typing import Any

from pydantic import BaseModel, Field

from app.core.json_persistence import _DATA_DIR
from app.modules.llm.infra.llm_client import LLMConfig

_RUNTIME_FILE = _DATA_DIR / "llm_settings.json"
_LOCK = threading.Lock()

# 读取缓存（1 秒 TTL），避免每次 LLM 调用都读盘
_cache: dict[str, Any] = {"data": None, "ts": 0.0}
_CACHE_TTL = 1.0


# ── 厂商预设（单一事实来源，前端 GET 时一并下发）──────────────
# 均为 OpenAI 兼容接口；base_url 指向 /v1 或等价路径，调用时拼 /chat/completions。
VENDOR_PRESETS: dict[str, dict[str, Any]] = {
    "deepseek": {
        "label": "DeepSeek",
        "base_url": "https://api.deepseek.com/v1",
        "models": ["deepseek-chat", "deepseek-reasoner"],
        "supports_embedding": False,
    },
    "openai": {
        "label": "OpenAI",
        "base_url": "https://api.openai.com/v1",
        "models": [
            "gpt-4o",
            "gpt-4o-mini",
            "gpt-4-turbo",
            "text-embedding-3-small",
            "text-embedding-3-large",
        ],
        "supports_embedding": True,
    },
    "moonshot": {
        "label": "Moonshot（Kimi）",
        "base_url": "https://api.moonshot.cn/v1",
        "models": ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
        "supports_embedding": False,
    },
    "qwen": {
        "label": "阿里通义千问",
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "models": [
            "qwen-plus",
            "qwen-max",
            "qwen-turbo",
            "qwen-long",
            "text-embedding-v3",
        ],
        "supports_embedding": True,
    },
    "zhipu": {
        "label": "智谱 GLM",
        "base_url": "https://open.bigmodel.cn/api/paas/v4",
        "models": ["glm-4-plus", "glm-4-air", "glm-4-flash"],
        "supports_embedding": False,
    },
    "hunyuan": {
        "label": "腾讯混元",
        "base_url": "https://api.hunyuan.cloud.tencent.com/v1",
        "models": ["hunyuan-pro", "hunyuan-standard", "hunyuan-lite"],
        "supports_embedding": False,
    },
    "qianfan": {
        "label": "百度千帆",
        "base_url": "https://qianfan.baidubce.com/v2",
        "models": ["ernie-4.0-8k", "ernie-3.5-8k", "ernie-speed-8k"],
        "supports_embedding": False,
    },
    "doubao": {
        "label": "字节豆包（火山方舟）",
        "base_url": "https://ark.cn-beijing.volces.com/api/v3",
        "models": ["doubao-pro-32k", "doubao-lite-32k"],
        "supports_embedding": False,
    },
    "siliconflow": {
        "label": "SiliconFlow（硅基流动）",
        "base_url": "https://api.siliconflow.cn/v1",
        "models": [
            "deepseek-ai/DeepSeek-V3",
            "deepseek-ai/DeepSeek-R1",
            "Qwen/Qwen2.5-72B-Instruct",
            "BAAI/bge-m3",
        ],
        "supports_embedding": True,
    },
    "ollama": {
        "label": "Ollama（本地）",
        "base_url": "http://localhost:11434/v1",
        "models": ["llama3", "qwen2.5", "deepseek-r1"],
        "supports_embedding": True,
    },
    "custom": {
        "label": "自定义 / 其他兼容服务",
        "base_url": "",
        "models": [],
        "supports_embedding": True,
    },
}


class LLMProviderSettings(BaseModel):
    """单个提供方（对话 or embedding）的配置。"""

    vendor: str = "custom"
    api_key: str = ""
    base_url: str = ""
    model: str = ""


class LLMRuntimeSettings(BaseModel):
    """页面可配置的全局 LLM 设置。"""

    chat: LLMProviderSettings = Field(default_factory=LLMProviderSettings)
    embedding: LLMProviderSettings = Field(default_factory=LLMProviderSettings)


def load_runtime_llm_settings() -> LLMRuntimeSettings | None:
    """读取落盘配置（带 1s TTL 缓存）。文件不存在返回 None。"""
    now = time.time()
    if _cache["data"] is not None and now - _cache["ts"] < _CACHE_TTL:
        return _cache["data"]
    data: LLMRuntimeSettings | None = None
    if _RUNTIME_FILE.exists():
        try:
            raw = json.loads(_RUNTIME_FILE.read_text(encoding="utf-8"))
            data = LLMRuntimeSettings.model_validate(raw)
        except (json.JSONDecodeError, ValueError) as exc:  # noqa: BLE001
            import logging

            logging.getLogger(__name__).warning(
                "[LLM-SETTINGS] 读取 %s 失败: %s", _RUNTIME_FILE, exc
            )
    _cache["data"] = data
    _cache["ts"] = now
    return data


def save_runtime_llm_settings(settings: LLMRuntimeSettings) -> None:
    """原子落盘并失效缓存。"""
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    tmp = _RUNTIME_FILE.with_suffix(".tmp")
    tmp.write_text(
        json.dumps(settings.model_dump(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    with _LOCK:
        tmp.replace(_RUNTIME_FILE)
    _cache["data"] = settings
    _cache["ts"] = time.time()


def resolve_runtime_llm_config(static_config: LLMConfig) -> LLMConfig:
    """合并 env 配置（static）与页面运行时配置。

    运行时配置中「已填写 api_key」的提供方覆盖 env 对应字段；
    未填写的部分回落到 env 默认值，保证两种方式可共存。
    """
    cfg = LLMConfig()
    cfg.api_key = static_config.api_key
    cfg.base_url = static_config.base_url
    cfg.model = static_config.model
    cfg.embedding_api_key = static_config.embedding_api_key
    cfg.embedding_base_url = static_config.embedding_base_url
    cfg.embedding_model = static_config.embedding_model

    runtime = load_runtime_llm_settings()
    if runtime is None:
        return cfg

    chat = runtime.chat
    if chat.api_key:
        cfg.api_key = chat.api_key
        cfg.base_url = chat.base_url or cfg.base_url
        cfg.model = chat.model or cfg.model

    emb = runtime.embedding
    if emb.api_key:
        cfg.embedding_api_key = emb.api_key
        cfg.embedding_base_url = emb.base_url or cfg.embedding_base_url
        cfg.embedding_model = emb.model or cfg.embedding_model

    return cfg


def mask_api_key(key: str) -> str | None:
    """脱敏：保留前缀与末 4 位，中间用 **** 替代。"""
    if not key:
        return None
    if len(key) <= 8:
        return key[:2] + "****"
    return key[:6] + "****" + key[-4:]
