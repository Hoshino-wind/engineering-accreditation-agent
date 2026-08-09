"""LLM 运行设置的领域模型与纯常量（无 IO、无框架配置依赖）。

与 infra.runtime_settings 的职责划分：
- 本文件：数据形态（Pydantic 模型）、厂商预设、脱敏纯函数；
- infra.runtime_settings：JSON 落盘 / 读取 / 缓存 / env 合并（IO 实现）。
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

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


def mask_api_key(key: str) -> str | None:
    """脱敏：保留前缀与末 4 位，中间用 **** 替代。"""
    if not key:
        return None
    if len(key) <= 8:
        return key[:2] + "****"
    return key[:6] + "****" + key[-4:]