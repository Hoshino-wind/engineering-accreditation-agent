"""基于 OpenAI 兼容 API 的 LLM 客户端实现（DeepSeek / Qwen / OpenAI 均可用）。

使用环境变量配置：
- EA_LLM_API_KEY: API 密钥
- EA_LLM_API_BASE_URL: API 地址（如 https://api.deepseek.com/v1）
- EA_LLM_MODEL: 模型名称（如 deepseek-chat）
- EA_LLM_EMBEDDING_API_KEY: Embedding API 密钥（可与主 key 相同）
- EA_LLM_EMBEDDING_BASE_URL: Embedding API 地址
- EA_LLM_EMBEDDING_MODEL: Embedding 模型名称
"""

from __future__ import annotations

import json
import time
import logging
from typing import Any

import httpx

from app.core.config import get_settings
from app.modules.llm.application.ports import LLMClientPort
from app.modules.llm.domain.models import (
    ExplanationItem,
    ExtractionItem,
    LLMResponse,
    LLMUsage,
    PlanStep,
    RelationItem,
    ReportChapterItem,
    SuggestionItem,
)

logger = logging.getLogger(__name__)


class LLMConfig:
    """从环境变量读取 LLM 配置。"""

    def __init__(self) -> None:
        settings = get_settings()
        self.api_key: str = getattr(settings, "llm_api_key", "") or ""
        self.base_url: str = getattr(settings, "llm_api_base_url", "") or "https://api.deepseek.com/v1"
        self.model: str = getattr(settings, "llm_model", "") or "deepseek-chat"
        self.timeout: float = 60.0
        self.embedding_api_key: str = getattr(settings, "llm_embedding_api_key", "") or self.api_key
        self.embedding_base_url: str = getattr(settings, "llm_embedding_base_url", "") or self.base_url
        self.embedding_model: str = getattr(settings, "llm_embedding_model", "") or "text-embedding-3-small"

    @property
    def is_configured(self) -> bool:
        """是否配置了真实 API Key。"""
        return bool(self.api_key)


class OpenAICompatibleLLMClient(LLMClientPort):
    """调用 OpenAI 兼容 API 的 LLM 客户端。

    未配置 API Key 时自动降级为 mock 响应，保证 Demo 可用。
    """

    def __init__(self, config: LLMConfig | None = None) -> None:
        self._config = config or LLMConfig()

    async def _call_chat(self, messages: list[dict], temperature: float = 0.3) -> dict:
        """调用 chat/completions 接口，返回 raw response dict。"""
        if not self._config.is_configured:
            logger.warning("LLM API Key 未配置，返回 mock 响应。请在 .env 中设置 EA_LLM_API_KEY")
            return {"mock": True}

        headers = {
            "Authorization": f"Bearer {self._config.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self._config.model,
            "messages": messages,
            "temperature": temperature,
            "response_format": {"type": "json_object"},
        }

        async with httpx.AsyncClient(timeout=self._config.timeout) as client:
            resp = await client.post(
                f"{self._config.base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            resp.raise_for_status()
            return resp.json()

    async def _call_embedding(self, texts: list[str]) -> list[list[float]]:
        """调用 embeddings 接口，返回向量列表。"""
        if not self._config.is_configured:
            # mock: 返回固定维度的零向量
            return [[0.0] * 512 for _ in texts]

        headers = {
            "Authorization": f"Bearer {self._config.embedding_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self._config.embedding_model,
            "input": texts,
        }

        async with httpx.AsyncClient(timeout=self._config.timeout) as client:
            resp = await client.post(
                f"{self._config.embedding_base_url}/embeddings",
                headers=headers,
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return [item["embedding"] for item in data["data"]]

    @staticmethod
    def _parse_json_content(content: str) -> Any:
        """从 LLM 响应中解析 JSON（兼容 ```json 包裹和裸 JSON）。"""
        text = content.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [l for l in lines if not l.startswith("```")]
            text = "\n".join(lines)
        return json.loads(text)

    @staticmethod
    def _build_usage(raw: dict) -> LLMUsage:
        usage = raw.get("usage", {})
        pt = usage.get("prompt_tokens", 0)
        ct = usage.get("completion_tokens", 0)
        return LLMUsage(prompt_tokens=pt, completion_tokens=ct, total_tokens=pt + ct)

    # ── 节点提取 ──────────────────────────────────────────

    async def extract_nodes(
        self,
        material_text: str,
        material_category: str,
        material_name: str,
    ) -> LLMResponse[list[ExtractionItem]]:
        start = time.time()

        system_prompt = (
            "你是工程教育认证材料解析专家。从给定的教学材料文本中提取结构化的课程、"
            "实验、知识点和资源节点。严格输出 JSON。"
        )
        user_prompt = f"""材料类型：{material_category}
材料名称：{material_name}
材料文本（前 8000 字符）：
{material_text[:8000]}

请提取出该材料中包含的教学节点，输出 JSON 格式：
{{
  "items": [
    {{
      "code": "课程/实验/知识点的编号（如 CO-DS-01）",
      "name": "节点名称",
      "kind": "course|experiment|knowledge|resource",
      "credit_hours": 3.0,
      "description": "简短描述",
      "confidence": 0.9,
      "source_excerpt": "提取依据的原文片段"
    }}
  ]
}}"""

        raw = await self._call_chat([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ])

        latency = int((time.time() - start) * 1000)

        if raw.get("mock"):
            return self._mock_extract(material_category, material_name, latency)

        content = raw["choices"][0]["message"]["content"]
        parsed = self._parse_json_content(content)
        items = [
            ExtractionItem(
                code=item["code"],
                name=item["name"],
                kind=item["kind"],
                credit_hours=item.get("credit_hours"),
                description=item.get("description"),
                confidence=item.get("confidence", 0.9),
                source_excerpt=item.get("source_excerpt"),
            )
            for item in parsed.get("items", [])
        ]

        return LLMResponse(
            data=items,
            model=self._config.model,
            usage=self._build_usage(raw),
            latency=latency,
        )

    # ── 关系推理 ──────────────────────────────────────────

    async def infer_relations(
        self,
        school_nodes: list[dict],
        standard_nodes: list[dict],
    ) -> LLMResponse[list[RelationItem]]:
        start = time.time()

        system_prompt = (
            "你是能力图谱关系推理专家。分析学校教学节点与认证标准能力指标之间的支撑关系，"
            "为每条关系给出置信度和推理依据。严格输出 JSON。"
        )
        user_prompt = f"""学校节点：
{json.dumps(school_nodes[:50], ensure_ascii=False)}

标准能力指标：
{json.dumps(standard_nodes[:30], ensure_ascii=False)}

请推断哪些学校节点支撑哪些标准指标，输出 JSON：
{{
  "items": [
    {{
      "source_id": "学校节点 ID",
      "target_id": "标准指标 ID",
      "relation_type": "SUPPORTS",
      "strength": "strong|medium|weak",
      "confidence": 0.85,
      "reasoning": "推理依据"
    }}
  ]
}}"""

        raw = await self._call_chat([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ])

        latency = int((time.time() - start) * 1000)

        if raw.get("mock"):
            return self._mock_relations(latency)

        content = raw["choices"][0]["message"]["content"]
        parsed = self._parse_json_content(content)
        items = [
            RelationItem(
                source_id=item["source_id"],
                target_id=item["target_id"],
                relation_type=item.get("relation_type", "SUPPORTS"),
                strength=item.get("strength", "medium"),
                confidence=item.get("confidence", 0.8),
                reasoning=item.get("reasoning", ""),
            )
            for item in parsed.get("items", [])
        ]

        return LLMResponse(
            data=items,
            model=self._config.model,
            usage=self._build_usage(raw),
            latency=latency,
        )

    # ── 诊断叙述 ──────────────────────────────────────────

    async def generate_explanation(
        self,
        gap_facts: list[dict],
        rag_context: list[str] | None = None,
    ) -> LLMResponse[list[ExplanationItem]]:
        start = time.time()

        rag_text = "\n\n".join(rag_context) if rag_context else "（无 RAG 上下文）"

        system_prompt = (
            "你是工程教育认证诊断专家。基于给定的缺口事实数据和检索到的材料原文，"
            "为每个不达标的能力指标生成连贯的诊断叙述。叙述必须引用具体数据，不要说空话。"
        )
        user_prompt = f"""缺口事实数据：
{json.dumps(gap_facts, ensure_ascii=False)}

RAG 检索到的材料原文：
{rag_text[:4000]}

请为每个缺口生成一段诊断叙述，输出 JSON：
{{
  "items": [
    {{
      "target_code": "指标编号",
      "target_name": "指标名称",
      "narrative": "诊断叙述（200-300字，引用具体数据）",
      "evidence_refs": ["证据来源1", "证据来源2"]
    }}
  ]
}}"""

        raw = await self._call_chat([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ])

        latency = int((time.time() - start) * 1000)

        if raw.get("mock"):
            return self._mock_explanation(gap_facts, latency)

        content = raw["choices"][0]["message"]["content"]
        parsed = self._parse_json_content(content)
        items = [
            ExplanationItem(
                target_code=item["target_code"],
                target_name=item["target_name"],
                narrative=item["narrative"],
                evidence_refs=item.get("evidence_refs"),
            )
            for item in parsed.get("items", [])
        ]

        return LLMResponse(
            data=items,
            model=self._config.model,
            usage=self._build_usage(raw),
            latency=latency,
        )

    # ── 改进建议 ──────────────────────────────────────────

    async def generate_suggestions(
        self,
        gaps: list[dict],
    ) -> LLMResponse[list[SuggestionItem]]:
        start = time.time()

        system_prompt = (
            "你是工程教育认证改进专家。针对认证缺口生成具体、可操作的改进建议。"
            "建议要具体到操作层面，不要说'建议加强支撑'这种空话。严格输出 JSON。"
        )
        user_prompt = f"""缺口列表：
{json.dumps(gaps, ensure_ascii=False)}

请为每个缺口生成改进建议，输出 JSON：
{{
  "items": [
    {{
      "target_code": "指标编号",
      "target_name": "指标名称",
      "root_cause": "根因分析",
      "suggestion": "具体建议",
      "expected_effect": "预期效果"
    }}
  ]
}}"""

        raw = await self._call_chat([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ])

        latency = int((time.time() - start) * 1000)

        if raw.get("mock"):
            return self._mock_suggestions(gaps, latency)

        content = raw["choices"][0]["message"]["content"]
        parsed = self._parse_json_content(content)
        items = [
            SuggestionItem(
                target_code=item["target_code"],
                target_name=item["target_name"],
                root_cause=item["root_cause"],
                suggestion=item["suggestion"],
                expected_effect=item["expected_effect"],
            )
            for item in parsed.get("items", [])
        ]

        return LLMResponse(
            data=items,
            model=self._config.model,
            usage=self._build_usage(raw),
            latency=latency,
        )

    # ── 报告生成 ──────────────────────────────────────────

    async def generate_report(
        self,
        report_context: list[dict],
    ) -> LLMResponse[list[ReportChapterItem]]:
        start = time.time()

        system_prompt = (
            "你是工程教育认证自评报告撰写专家。根据给定的达成度数据和改进方向，"
            "为每条毕业要求生成一段符合认证报告体例的叙述。严格输出 JSON。"
        )
        user_prompt = f"""数据：
{json.dumps(report_context, ensure_ascii=False)}

请为每条毕业要求生成自评报告章节，输出 JSON：
{{
  "items": [
    {{
      "requirement_code": "GR-01",
      "chapter_title": "GR-01 工程知识",
      "standard_ref": "工程知识",
      "narrative": "本专业在工程知识方面的达成情况...（200-300字）"
    }}
  ]
}}"""

        raw = await self._call_chat([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ])

        latency = int((time.time() - start) * 1000)

        if raw.get("mock"):
            return self._mock_report(report_context, latency)

        content = raw["choices"][0]["message"]["content"]
        parsed = self._parse_json_content(content)
        items = [
            ReportChapterItem(
                requirement_code=item["requirement_code"],
                chapter_title=item["chapter_title"],
                standard_ref=item["standard_ref"],
                narrative=item["narrative"],
            )
            for item in parsed.get("items", [])
        ]

        return LLMResponse(
            data=items,
            model=self._config.model,
            usage=self._build_usage(raw),
            latency=latency,
        )

    # ── 规划（Supervisor） ────────────────────────────────

    async def plan(
        self,
        goal: str,
        context: list[dict] | None = None,
    ) -> LLMResponse[list[PlanStep]]:
        start = time.time()

        system_prompt = (
            "你是工程教育认证多智能体系统的规划专家（Supervisor）。"
            "给定一个认证目标，规划完成它所需的协作步骤。严格输出 JSON。"
        )
        user_prompt = f"""认证目标：{goal}

可用的专项智能体阶段：
- extract 提取教学节点
- infer 推断支撑关系
- review 人工审核（人在回路）
- coverage 覆盖度分析
- diagnose 缺口诊断
- improve 改进建议
- report 报告撰写

请输出 JSON：
{{
  "items": [
    {{"phase": "extract", "title": "步骤标题", "description": "该步骤要做什么"}}
  ]
}}"""

        raw = await self._call_chat([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ])

        latency = int((time.time() - start) * 1000)

        if raw.get("mock"):
            return await super().plan(goal, context)

        try:
            content = raw["choices"][0]["message"]["content"]
            parsed = self._parse_json_content(content)
            items = [
                PlanStep(
                    phase=str(item.get("phase", "")),
                    title=str(item.get("title", "")),
                    description=str(item.get("description", "")),
                )
                for item in parsed.get("items", [])
                if item.get("phase")
            ]
            if not items:
                return await super().plan(goal, context)
            return LLMResponse(
                data=items,
                model=self._config.model,
                usage=self._build_usage(raw),
                latency=latency,
            )
        except Exception:  # noqa: BLE001 — 规划失败时回退到确定性计划
            logger.warning("LLM 规划失败，回退到确定性计划。")
            return await super().plan(goal, context)

    # ── Embedding 接口（给 RAG 用） ──────────────────────

    async def embed(self, texts: list[str]) -> list[list[float]]:
        """批量文本向量化。"""
        return await self._call_embedding(texts)

    # ── Mock 降级实现（无 API Key 时） ────────────────────

    def _mock_extract(
        self, material_category: str, material_name: str, latency: int
    ) -> LLMResponse[list[ExtractionItem]]:
        """无 API Key 时的降级：返回与前端 mock 一致的静态节点。"""
        from app.modules.llm.infra.mock_data import get_mock_extraction_items

        items = get_mock_extraction_items(material_category, material_name)
        return LLMResponse(
            data=items,
            model="deepseek-v2 (mock)",
            usage=LLMUsage(prompt_tokens=0, completion_tokens=0, total_tokens=0),
            latency=latency,
        )

    def _mock_relations(self, latency: int) -> LLMResponse[list[RelationItem]]:
        from app.modules.llm.infra.mock_data import get_mock_relation_items

        items = get_mock_relation_items()
        return LLMResponse(
            data=items,
            model="deepseek-v2 (mock)",
            usage=LLMUsage(prompt_tokens=0, completion_tokens=0, total_tokens=0),
            latency=latency,
        )

    def _mock_explanation(
        self, gap_facts: list[dict], latency: int
    ) -> LLMResponse[list[ExplanationItem]]:
        """降级：用规则化拼装代替 LLM 生成。"""
        items = [
            ExplanationItem(
                target_code=fact.get("code", ""),
                target_name=fact.get("name", ""),
                narrative=fact.get("rule_based_explanation", "暂无诊断叙述。"),
                evidence_refs=fact.get("evidence_refs"),
            )
            for fact in gap_facts
        ]
        return LLMResponse(
            data=items,
            model="deepseek-v2 (mock)",
            usage=LLMUsage(prompt_tokens=0, completion_tokens=0, total_tokens=0),
            latency=latency,
        )

    def _mock_suggestions(
        self, gaps: list[dict], latency: int
    ) -> LLMResponse[list[SuggestionItem]]:
        from app.modules.llm.infra.mock_data import get_mock_suggestion_items

        items = get_mock_suggestion_items(gaps)
        return LLMResponse(
            data=items,
            model="deepseek-v2 (mock)",
            usage=LLMUsage(prompt_tokens=0, completion_tokens=0, total_tokens=0),
            latency=latency,
        )

    def _mock_report(
        self, report_context: list[dict], latency: int
    ) -> LLMResponse[list[ReportChapterItem]]:
        from app.modules.llm.infra.mock_data import get_mock_report_items

        items = get_mock_report_items(report_context)
        return LLMResponse(
            data=items,
            model="deepseek-v2 (mock)",
            usage=LLMUsage(prompt_tokens=0, completion_tokens=0, total_tokens=0),
            latency=latency,
        )
