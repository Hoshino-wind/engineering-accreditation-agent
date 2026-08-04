from pydantic import BaseModel

from app.modules.graph.domain import AbilityGraph, AbilityGraphEdge, AbilityGraphNode


class AbilityGraphNodeResponse(BaseModel):
    id: str
    kind: str
    code: str
    name: str
    description: str | None = None
    origin: str | None = None
    properties: dict[str, str | int | float]

    @classmethod
    def from_domain(cls, node: AbilityGraphNode) -> "AbilityGraphNodeResponse":
        return cls(
            id=node.id,
            kind=node.kind,
            code=node.code,
            name=node.name,
            description=node.description or None,
            origin=node.origin,
            properties=node.properties,
        )


class AbilityGraphEdgeResponse(BaseModel):
    id: str
    source: str
    target: str
    kind: str
    sourceType: str
    reviewStatus: str
    strength: str | None = None
    confidence: float | None = None
    aiReasoning: str | None = None
    candidateId: str | None = None
    reviewedBy: str | None = None
    reviewedAt: str | None = None
    evidenceSummary: str | None = None

    @classmethod
    def from_domain(cls, edge: AbilityGraphEdge) -> "AbilityGraphEdgeResponse":
        return cls(
            id=edge.id,
            source=edge.source,
            target=edge.target,
            kind=edge.kind,
            sourceType=edge.source_type,
            reviewStatus=edge.review_status,
            strength=edge.strength,
            confidence=edge.confidence,
            aiReasoning=edge.ai_reasoning,
            candidateId=edge.candidate_id,
            reviewedBy=edge.reviewed_by,
            reviewedAt=edge.reviewed_at,
            evidenceSummary=edge.evidence_summary,
        )


class AbilityGraphResponse(BaseModel):
    nodes: list[AbilityGraphNodeResponse]
    edges: list[AbilityGraphEdgeResponse]

    @classmethod
    def from_domain(cls, graph: AbilityGraph) -> "AbilityGraphResponse":
        return cls(
            nodes=[AbilityGraphNodeResponse.from_domain(node) for node in graph.nodes],
            edges=[AbilityGraphEdgeResponse.from_domain(edge) for edge in graph.edges],
        )


class GraphEdgeReviewRequest(BaseModel):
    decision: str
