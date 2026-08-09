"""编排模块 HTTP 契约（请求/响应）。

该 API 面为新增的智能体协作接口，请求与响应统一使用 camelCase，前端直接消费无需映射。
"""

from typing import Any, Literal

from pydantic import BaseModel, Field


# ── 请求 ────────────────────────────────────────────────


class StartRunRequest(BaseModel):
    goal: str
    materialCategory: str | None = None
    materialName: str | None = None


class ReviewDecisionItem(BaseModel):
    relationId: str
    decision: Literal["approved", "rejected"]
    strength: Literal["strong", "medium", "weak"] | None = None


class ReviewRequest(BaseModel):
    decisions: list[ReviewDecisionItem] = Field(default_factory=list)


# ── 响应 ────────────────────────────────────────────────


class ToolCallResponse(BaseModel):
    tool: str
    agent: str
    status: str
    summary: str = ""
    latencyMs: int = 0
    detail: dict[str, Any] = Field(default_factory=dict)


class AgentStepResponse(BaseModel):
    phase: str
    agent: str
    title: str
    status: str
    summary: str = ""
    startedAt: str | None = None
    finishedAt: str | None = None
    toolCalls: list[ToolCallResponse] = Field(default_factory=list)


class RunResponse(BaseModel):
    runId: str
    goal: str
    status: str
    plan: list[str] = Field(default_factory=list)
    steps: list[AgentStepResponse] = Field(default_factory=list)
    pendingReview: list[dict[str, Any]] = Field(default_factory=list)
    result: dict[str, Any] = Field(default_factory=dict)
    createdAt: str | None = None
    updatedAt: str | None = None
    error: str | None = None


class RunEventResponse(BaseModel):
    event: str
    runId: str
    data: dict[str, Any] = Field(default_factory=dict)
