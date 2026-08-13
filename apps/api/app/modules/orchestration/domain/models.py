"""编排模块领域模型。

全部为框架无关的纯数据类（dataclass）与枚举，不依赖 app.core / langgraph / fastapi，
因此可被架构边界测试安全地放在 domain 层。
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Literal

# ── 枚举 ────────────────────────────────────────────────


class RunStatus(str, Enum):
    """一次智能体运行的整体状态。"""

    PENDING = "pending"
    PLANNING = "planning"
    RUNNING = "running"
    AWAITING_REVIEW = "awaiting_review"
    COMPLETED = "completed"
    FAILED = "failed"


class AgentPhase(str, Enum):
    """多智能体协作中的阶段（每个阶段对应一个专项智能体或网关）。"""

    PLAN = "plan"
    EXTRACT = "extract"
    INFER = "infer"
    REVIEW = "review"
    COVERAGE = "coverage"
    DIAGNOSE = "diagnose"
    IMPROVE = "improve"
    REPORT = "report"
    DONE = "done"


class StepStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


# ── 能力图谱模型（覆盖度分析的输入） ──────────────────────

NodeKind = Literal[
    "GraduationRequirement",
    "Competency",
    "Course",
    "Experiment",
    "KnowledgePoint",
    "TeachingResource",
]
EdgeKind = Literal[
    "CONTAINS",
    "SUPPORTS_REQ",
    "BELONGS_TO",
    "SUPPORTS",
    "COVERS_KNOWLEDGE",
    "USES_RESOURCE",
]
EdgeReviewStatus = Literal["pending", "approved", "rejected", "modified"]
Strength = Literal["strong", "medium", "weak"]


@dataclass(frozen=True)
class GraphNode:
    id: str
    kind: NodeKind
    code: str
    name: str
    origin: Literal["standard", "school"] = "school"
    description: str | None = None
    properties: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "kind": self.kind,
            "code": self.code,
            "name": self.name,
            "origin": self.origin,
            "description": self.description,
            "properties": dict(self.properties),
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "GraphNode":
        return cls(
            id=d["id"],
            kind=d["kind"],
            code=d["code"],
            name=d["name"],
            origin=d.get("origin", "school"),
            description=d.get("description"),
            properties=dict(d.get("properties") or {}),
        )


@dataclass(frozen=True)
class GraphEdge:
    id: str
    source: str
    target: str
    kind: EdgeKind
    source_type: Literal["ai", "manual", "rule"] = "ai"
    review_status: EdgeReviewStatus = "pending"
    strength: Strength | None = None
    confidence: float | None = None
    reasoning: str | None = None
    material_resource_id: str | None = None
    material_version_group_id: str | None = None
    material_version: str | None = None
    material_name: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "source": self.source,
            "target": self.target,
            "kind": self.kind,
            "sourceType": self.source_type,
            "reviewStatus": self.review_status,
            "strength": self.strength,
            "confidence": self.confidence,
            "reasoning": self.reasoning,
            "materialResourceId": self.material_resource_id,
            "materialVersionGroupId": self.material_version_group_id,
            "materialVersion": self.material_version,
            "materialName": self.material_name,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "GraphEdge":
        return cls(
            id=d["id"],
            source=d["source"],
            target=d["target"],
            kind=d["kind"],
            source_type=d.get("sourceType", "ai"),
            review_status=d.get("reviewStatus", "pending"),
            strength=d.get("strength"),
            confidence=d.get("confidence"),
            reasoning=d.get("reasoning"),
            material_resource_id=d.get("materialResourceId"),
            material_version_group_id=d.get("materialVersionGroupId"),
            material_version=d.get("materialVersion"),
            material_name=d.get("materialName"),
        )


@dataclass(frozen=True)
class AbilityGraph:
    nodes: list[GraphNode] = field(default_factory=list)
    edges: list[GraphEdge] = field(default_factory=list)

    def node_by_id(self, node_id: str) -> GraphNode | None:
        for node in self.nodes:
            if node.id == node_id:
                return node
        return None

    def approved_edges(self) -> list[GraphEdge]:
        return [e for e in self.edges if e.review_status == "approved"]


# ── 覆盖度 / 达成度结果模型 ──────────────────────────────


@dataclass(frozen=True)
class CompetencyCoverage:
    code: str
    name: str
    requirement_code: str
    status: Literal["gap", "partial", "covered"]
    total_strength: int
    strong_count: int
    medium_count: int
    weak_count: int
    supporter_count: int
    evidence_source_count: int
    has_pending_review: bool
    attainment: float
    supporters: list[str] = field(default_factory=list)
    evidence: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "code": self.code,
            "name": self.name,
            "requirementCode": self.requirement_code,
            "status": self.status,
            "totalStrength": self.total_strength,
            "strongCount": self.strong_count,
            "mediumCount": self.medium_count,
            "weakCount": self.weak_count,
            "supporterCount": self.supporter_count,
            "evidenceSourceCount": self.evidence_source_count,
            "hasPendingReview": self.has_pending_review,
            "attainment": round(self.attainment, 3),
            "supporters": list(self.supporters),
            "evidence": [dict(item) for item in self.evidence],
        }


@dataclass(frozen=True)
class RequirementCoverage:
    code: str
    name: str
    status: Literal["gap", "partial", "covered"]
    coverage_rate: float
    competency_count: int
    covered_count: int
    strong_support_count: int
    supporting_courses: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "code": self.code,
            "name": self.name,
            "status": self.status,
            "coverageRate": round(self.coverage_rate, 3),
            "competencyCount": self.competency_count,
            "coveredCount": self.covered_count,
            "strongSupportCount": self.strong_support_count,
            "supportingCourses": list(self.supporting_courses),
        }


@dataclass(frozen=True)
class CoverageReport:
    overall_coverage_rate: float
    gap_count: int
    partial_count: int
    covered_count: int
    orphan_node_count: int
    requirements: list[RequirementCoverage] = field(default_factory=list)
    competencies: list[CompetencyCoverage] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "overallCoverageRate": round(self.overall_coverage_rate, 3),
            "gapCount": self.gap_count,
            "partialCount": self.partial_count,
            "coveredCount": self.covered_count,
            "orphanNodeCount": self.orphan_node_count,
            "requirements": [r.to_dict() for r in self.requirements],
            "competencies": [c.to_dict() for c in self.competencies],
        }


# ── 运行 / 步骤 / 审核模型 ──────────────────────────────


@dataclass(frozen=True)
class ToolCallRecord:
    tool: str
    agent: str
    status: StepStatus
    summary: str = ""
    latency_ms: int = 0
    detail: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "tool": self.tool,
            "agent": self.agent,
            "status": self.status.value,
            "summary": self.summary,
            "latencyMs": self.latency_ms,
            "detail": dict(self.detail),
        }


@dataclass
class AgentStep:
    phase: AgentPhase
    agent: str
    title: str
    status: StepStatus = StepStatus.PENDING
    summary: str = ""
    started_at: str | None = None
    finished_at: str | None = None
    tool_calls: list[ToolCallRecord] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "phase": self.phase.value,
            "agent": self.agent,
            "title": self.title,
            "status": self.status.value,
            "summary": self.summary,
            "startedAt": self.started_at,
            "finishedAt": self.finished_at,
            "toolCalls": [t.to_dict() for t in self.tool_calls],
        }


@dataclass(frozen=True)
class ReviewDecision:
    relation_id: str
    decision: Literal["approved", "rejected"]
    strength: Strength | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "relationId": self.relation_id,
            "decision": self.decision,
            "strength": self.strength,
        }


@dataclass
class AgentRun:
    run_id: str
    goal: str
    status: RunStatus = RunStatus.PENDING
    plan: list[str] = field(default_factory=list)
    steps: list[AgentStep] = field(default_factory=list)
    pending_review: list[dict[str, Any]] = field(default_factory=list)
    result: dict[str, Any] = field(default_factory=dict)
    created_at: str | None = None
    updated_at: str | None = None
    error: str | None = None

    def step_for(self, phase: AgentPhase) -> AgentStep | None:
        for step in self.steps:
            if step.phase == phase:
                return step
        return None

    def to_dict(self) -> dict[str, Any]:
        return {
            "runId": self.run_id,
            "goal": self.goal,
            "status": self.status.value,
            "plan": list(self.plan),
            "steps": [s.to_dict() for s in self.steps],
            "pendingReview": list(self.pending_review),
            "result": dict(self.result),
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
            "error": self.error,
        }
