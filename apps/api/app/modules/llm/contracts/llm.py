"""LLM API 请求/响应契约 — 与前端 llmClient.ts 类型对齐。"""

from __future__ import annotations

from pydantic import BaseModel, Field

# ── 通用 ────────────────────────────────────────────────


class LLMUsageResponse(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class LLMBaseResponse(BaseModel):
    model: str
    usage: LLMUsageResponse = Field(default_factory=LLMUsageResponse)
    latency: int = 0


# ── 节点提取 ──────────────────────────────────────────────


class ExtractNodesRequest(BaseModel):
    material_text: str = ""
    material_category: str = ""
    material_name: str = ""


class ExtractionItemResponse(BaseModel):
    code: str
    name: str
    kind: str  # course|experiment|knowledge|resource
    credit_hours: float | None = None
    description: str | None = None
    confidence: float = 0.9
    source_excerpt: str | None = None


class ExtractNodesResponse(LLMBaseResponse):
    data: list[ExtractionItemResponse]


# ── 关系推理 ──────────────────────────────────────────────


class InferRelationsRequest(BaseModel):
    school_nodes: list[dict] = []
    standard_nodes: list[dict] = []


class RelationItemResponse(BaseModel):
    source_id: str
    target_id: str
    relation_type: str = "SUPPORTS"
    strength: str = "medium"
    confidence: float = 0.8
    reasoning: str = ""


class InferRelationsResponse(LLMBaseResponse):
    data: list[RelationItemResponse]


# ── 诊断叙述 ──────────────────────────────────────────────


class GenerateExplanationRequest(BaseModel):
    gap_facts: list[dict] = []
    rag_context: list[str] | None = None


class ExplanationItemResponse(BaseModel):
    target_code: str
    target_name: str
    narrative: str
    evidence_refs: list[str] | None = None


class GenerateExplanationResponse(LLMBaseResponse):
    data: list[ExplanationItemResponse]


# ── 改进建议 ──────────────────────────────────────────────


class GenerateSuggestionsRequest(BaseModel):
    gaps: list[dict] = []


class SuggestionItemResponse(BaseModel):
    target_code: str
    target_name: str
    root_cause: str
    suggestion: str
    expected_effect: str


class GenerateSuggestionsResponse(LLMBaseResponse):
    data: list[SuggestionItemResponse]


# ── 报告生成 ──────────────────────────────────────────────


class GenerateReportRequest(BaseModel):
    report_context: list[dict] = []


class ReportChapterItemResponse(BaseModel):
    requirement_code: str
    chapter_title: str
    standard_ref: str
    narrative: str


class GenerateReportResponse(LLMBaseResponse):
    data: list[ReportChapterItemResponse]


# ── RAG 检索 ──────────────────────────────────────────────


class RAGSearchRequest(BaseModel):
    query: str
    top_k: int = 3
    source_filter: str | None = None


class RAGChunkResponse(BaseModel):
    text: str
    source: str
    page: int | None = None
    score: float = 0.0


class RAGSearchResponse(BaseModel):
    query: str
    chunks: list[RAGChunkResponse]
