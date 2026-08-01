"""LLM 客户端接口定义 — 由 infra 层实现，支持真实 API 和 mock 两种模式。"""

from __future__ import annotations

from abc import ABC, abstractmethod

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

_DEFAULT_PLAN: tuple[tuple[str, str, str], ...] = (
    ("extract", "提取教学节点", "解析上传材料，抽取课程/实验/知识点节点"),
    ("infer", "推断支撑关系", "推断学校节点对标准能力指标的支撑关系"),
    ("review", "人工审核", "教师审核 AI 推断的支撑关系（人在回路）"),
    ("coverage", "覆盖度分析", "基于已审核关系计算覆盖度与达成度"),
    ("diagnose", "缺口诊断", "为覆盖缺口生成诊断叙述"),
    ("improve", "改进建议", "针对缺口生成可操作的改进建议"),
    ("report", "报告撰写", "撰写自评报告章节"),
)


class LLMClientPort(ABC):
    """LLM 调用的抽象接口。"""

    @abstractmethod
    async def extract_nodes(
        self,
        material_text: str,
        material_category: str,
        material_name: str,
    ) -> LLMResponse[list[ExtractionItem]]:
        """从材料文本中提取结构化节点。"""

    @abstractmethod
    async def infer_relations(
        self,
        school_nodes: list[dict],
        standard_nodes: list[dict],
    ) -> LLMResponse[list[RelationItem]]:
        """推断学校节点与标准节点之间的支撑关系。"""

    @abstractmethod
    async def generate_explanation(
        self,
        gap_facts: list[dict],
        rag_context: list[str] | None = None,
    ) -> LLMResponse[list[ExplanationItem]]:
        """基于缺口事实 + RAG 上下文生成诊断叙述。"""

    @abstractmethod
    async def generate_suggestions(
        self,
        gaps: list[dict],
    ) -> LLMResponse[list[SuggestionItem]]:
        """基于缺口数据生成改进建议。"""

    @abstractmethod
    async def generate_report(
        self,
        report_context: list[dict],
    ) -> LLMResponse[list[ReportChapterItem]]:
        """基于全图谱数据生成自评报告章节。"""

    async def plan(
        self,
        goal: str,
        context: list[dict] | None = None,
    ) -> LLMResponse[list[PlanStep]]:
        """为目标生成协作计划。

        默认实现返回确定性的流水线计划，保证无 LLM 时 Supervisor 仍可运行；
        具体客户端可覆写为真实的大模型规划。
        """
        steps = [
            PlanStep(phase=phase, title=title, description=desc)
            for phase, title, desc in _DEFAULT_PLAN
        ]
        return LLMResponse(
            data=steps,
            model="deterministic-planner",
            usage=LLMUsage(prompt_tokens=0, completion_tokens=0, total_tokens=0),
            latency=0,
        )
