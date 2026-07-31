import base64
import hashlib
import json
import re
from typing import Any
from uuid import uuid4

import httpx

from app.modules.materials.application import DocumentParseError
from app.modules.materials.domain import EvidenceFragment


class DeepSeekClient:
    def __init__(
        self,
        *,
        base_url: str,
        api_key: str | None,
        model: str,
        timeout_seconds: float,
    ) -> None:
        self._endpoint = f"{base_url.rstrip('/')}/chat/completions"
        self._api_key = api_key
        self._model = model
        self._timeout_seconds = timeout_seconds

    async def complete(self, messages: list[dict[str, Any]], **options: Any) -> str:
        headers = {"Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        try:
            async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                response = await client.post(
                    self._endpoint,
                    headers=headers,
                    json={"model": self._model, "messages": messages, **options},
                )
                response.raise_for_status()
                payload = response.json()
                content = payload["choices"][0]["message"]["content"]
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as error:
            raise DocumentParseError(f"DeepSeek 服务调用失败：{error}") from error
        if not isinstance(content, str) or not content.strip():
            raise DocumentParseError("DeepSeek 服务返回了空内容")
        return content.strip()


class DeepSeekOcrGateway:
    def __init__(self, client: DeepSeekClient) -> None:
        self._client = client

    async def recognize(self, image: bytes, media_type: str) -> str:
        encoded = base64.b64encode(image).decode("ascii")
        return await self._client.complete(
            [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{media_type};base64,{encoded}",
                            },
                        },
                        {
                            "type": "text",
                            "text": (
                                "<image>\n<|grounding|>Convert this document image "
                                "to accurate Markdown. Preserve headings, tables and "
                                "reading order. Do not explain."
                            ),
                        },
                    ],
                }
            ],
            temperature=0,
        )


class DeepSeekStructureGateway:
    def __init__(self, client: DeepSeekClient) -> None:
        self._client = client

    async def structure(
        self, text: str, source_name: str
    ) -> list[EvidenceFragment]:
        content = await self._client.complete(
            [
                {
                    "role": "system",
                    "content": (
                        "你是工程教育认证材料解析器。只返回 JSON 对象，键 fragments "
                        "是数组；每项含 coordinate、type、preview。type 只能是"
                        "段落、表格、扫描页。保留可核验原文，不推断不存在的内容。"
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"来源文件：{source_name}\n"
                        "请提取最多 40 个对课程目标、实验要求、评分标准和改进记录"
                        f"有用的证据片段：\n\n{text[:120_000]}"
                    ),
                },
            ],
            response_format={"type": "json_object"},
            temperature=0,
        )
        payload = self._load_json(content)
        items = payload.get("fragments")
        if not isinstance(items, list):
            raise DocumentParseError("DeepSeek 结构化结果缺少 fragments 数组")
        fragments: list[EvidenceFragment] = []
        for item in items[:40]:
            if not isinstance(item, dict):
                continue
            preview = str(item.get("preview", "")).strip()
            if not preview:
                continue
            kind = str(item.get("type", "段落"))
            if kind not in {"段落", "表格", "扫描页"}:
                kind = "段落"
            fragments.append(
                EvidenceFragment(
                    id=f"fragment-{uuid4()}",
                    coordinate=str(item.get("coordinate", "原文定位待确认")),
                    kind=kind,
                    preview=preview[:500],
                    sha256=hashlib.sha256(preview.encode()).hexdigest(),
                )
            )
        return fragments

    @staticmethod
    def _load_json(content: str) -> dict[str, Any]:
        cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", content.strip())
        try:
            payload = json.loads(cleaned)
        except json.JSONDecodeError as error:
            raise DocumentParseError("DeepSeek 结构化结果不是有效 JSON") from error
        if not isinstance(payload, dict):
            raise DocumentParseError("DeepSeek 结构化结果必须是 JSON 对象")
        return payload
