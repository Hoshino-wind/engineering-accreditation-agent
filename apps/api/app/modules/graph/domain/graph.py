from dataclasses import dataclass, field


@dataclass(frozen=True, slots=True)
class AbilityGraphNode:
    id: str
    kind: str
    code: str
    name: str
    description: str = ""
    origin: str = "school"
    properties: dict[str, str | int | float] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class AbilityGraphEdge:
    id: str
    source: str
    target: str
    kind: str
    source_type: str
    review_status: str
    strength: str | None = None
    confidence: float | None = None
    ai_reasoning: str | None = None
    candidate_id: str | None = None
    reviewed_by: str | None = None
    reviewed_at: str | None = None
    evidence_summary: str | None = None


@dataclass(frozen=True, slots=True)
class AbilityGraph:
    nodes: list[AbilityGraphNode]
    edges: list[AbilityGraphEdge]
