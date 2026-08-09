"""LLM 领域模型：节点提取、关系推理、诊断叙述、建议生成、报告生成的基础类型。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class LLMUsage:
    """LLM 调用的 token 使用量。"""

    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


@dataclass(frozen=True)
class LLMResponse[T]:
    """LLM 调用的统一响应结构，与前端 llmClient.ts 对齐。"""

    data: T
    model: str
    usage: LLMUsage
    latency: int  # 毫秒


# ── 规划（Supervisor 计划） ───────────────────────────────


@dataclass(frozen=True)
class PlanStep:
    """Supervisor 智能体计划中的单个步骤。"""

    phase: str
    title: str
    description: str = ""


# ── 材料分类 ──────────────────────────────────────────────


@dataclass(frozen=True)
class ClassificationResult:
    """LLM 对上传材料的分类结果。

    评分表 / 学生报告 / 评价结果 本轮不进入节点提取主流水线
    （按类型分流的处理策略见 graph.extract_node）。
    """

    category: str
    confidence: float
    reason: str  # 判断依据（可溯源）
    is_evaluation_evidence: bool  # 是否为评价证据（评分表/学生报告/评价结果）


# ── 节点提取 ──────────────────────────────────────────────


@dataclass(frozen=True)
class ExtractionItem:
    """LLM 从材料中提取出的单个节点。"""

    code: str
    name: str
    kind: Literal["course", "experiment", "knowledge", "resource"]
    credit_hours: float | None = None
    description: str | None = None
    confidence: float = 0.9
    source_excerpt: str | None = None


# ── 关系推理 ──────────────────────────────────────────────


@dataclass(frozen=True)
class RelationItem:
    """LLM 推断出的支撑关系。"""

    source_id: str
    target_id: str
    relation_type: Literal["SUPPORTS", "CONTAINS", "COVERS_KNOWLEDGE"]
    strength: Literal["strong", "medium", "weak"] = "medium"
    confidence: float = 0.8
    reasoning: str = ""


# ── 诊断叙述 ──────────────────────────────────────────────


@dataclass(frozen=True)
class ExplanationItem:
    """LLM 生成的诊断叙述。"""

    target_code: str
    target_name: str
    narrative: str
    evidence_refs: list[str] | None = None


# ── 改进建议 ──────────────────────────────────────────────


@dataclass(frozen=True)
class SuggestionItem:
    """LLM 生成的改进建议。"""

    target_code: str
    target_name: str
    root_cause: str
    suggestion: str
    expected_effect: str


# ── 报告生成 ──────────────────────────────────────────────


@dataclass(frozen=True)
class ReportChapterItem:
    """LLM 生成的自评报告章节。"""

    requirement_code: str
    chapter_title: str
    standard_ref: str
    narrative: str


# ── RAG 检索结果 ──────────────────────────────────────────


@dataclass(frozen=True)
class RAGChunk:
    """RAG 检索返回的单个文本块。"""

    text: str
    source: str  # 材料文件名
    page: int | None = None
    score: float = 0.0


@dataclass(frozen=True)
class RAGSearchResult:
    """RAG 检索结果。"""

    query: str
    chunks: list[RAGChunk]
