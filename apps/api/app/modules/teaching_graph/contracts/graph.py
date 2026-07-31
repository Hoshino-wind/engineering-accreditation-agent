from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.modules.teaching_graph.domain import GraphAuditEvent, GraphWorkspace


def to_camel(value: str) -> str:
    head, *tail = value.split("_")
    return head + "".join(part.capitalize() for part in tail)


class GraphContract(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        extra="forbid",
        populate_by_name=True,
    )


class GraphSourceContract(GraphContract):
    coordinate: str = Field(min_length=1, max_length=240)
    evidence_fragment_id: str = Field(min_length=1, max_length=160)
    material: str = Field(min_length=1, max_length=240)
    material_id: str = Field(min_length=1, max_length=160)
    material_version_id: str = Field(min_length=1, max_length=160)
    source_ref_id: str = Field(min_length=1, max_length=160)
    version: str = Field(min_length=1, max_length=80)


CapabilityBehavior = Annotated[str, Field(min_length=1, max_length=160)]
CurrentGraphSchemaVersion = Literal["teaching-graph-schema@2"]


class GraphCapabilityContract(GraphContract):
    cognitive_level: Literal[
        "understand",
        "apply",
        "analyze",
        "evaluate",
        "create",
    ]
    domain: str = Field(min_length=1, max_length=160)
    observable_behaviors: list[CapabilityBehavior] = Field(
        min_length=1,
        max_length=8,
    )


class GraphCapabilityMappingContract(GraphContract):
    rationale: str = Field(min_length=1, max_length=1000)
    target_behaviors: list[CapabilityBehavior] = Field(
        min_length=1,
        max_length=8,
    )


class GraphNodeContract(GraphContract):
    capability: GraphCapabilityContract | None = None
    code: str = Field(min_length=1, max_length=80)
    definition: str = Field(min_length=1, max_length=2000)
    id: str = Field(min_length=1, max_length=160)
    name: str = Field(min_length=1, max_length=240)
    node_version_id: str = Field(min_length=1, max_length=160)
    owner: str = Field(min_length=1, max_length=120)
    source: GraphSourceContract
    status: Literal["effective", "draft", "superseded"] = "draft"
    type: Literal[
        "graduate-outcome",
        "performance-indicator",
        "course",
        "course-outcome",
        "ability",
        "skill",
        "knowledge",
        "experiment",
        "teaching-resource",
        "assessment-task",
        "rubric-criterion",
    ]
    version: str = Field(min_length=1, max_length=80)


class GraphEdgeContract(GraphContract):
    capability_mapping: GraphCapabilityMappingContract | None = None
    edge_version_id: str = Field(min_length=1, max_length=160)
    effective_cycle: str = Field(min_length=1, max_length=120)
    id: str = Field(min_length=1, max_length=160)
    relation: Literal[
        "refines",
        "expects",
        "defines",
        "belongs-to",
        "supports",
        "contributes-to",
        "cultivates",
        "trains",
        "covers",
        "composed-of",
        "requires",
        "uses",
        "enables",
        "contains-task",
        "contains-criterion",
        "assesses",
    ]
    review_status: Literal["approved", "pending"] = "pending"
    source: GraphSourceContract
    source_id: str = Field(min_length=1, max_length=160)
    source_node_version_id: str = Field(min_length=1, max_length=160)
    status: Literal["effective", "draft", "superseded"] = "draft"
    target_id: str = Field(min_length=1, max_length=160)
    target_node_version_id: str = Field(min_length=1, max_length=160)


class GraphPublishedSnapshotContract(GraphContract):
    edges: list[GraphEdgeContract]
    nodes: list[GraphNodeContract]
    published_at: datetime
    schema_version_id: CurrentGraphSchemaVersion
    version: str = Field(min_length=1, max_length=80)


class GraphDownstreamReferenceContract(GraphContract):
    edge_ids: list[str]
    edge_version_ids: list[str]
    graph_version: str = Field(min_length=1, max_length=80)
    id: str = Field(min_length=1, max_length=160)
    label: str = Field(min_length=1, max_length=240)
    module: Literal["M5", "M6", "M8"]
    node_ids: list[str]
    node_version_ids: list[str]
    object_code: str = Field(min_length=1, max_length=120)
    schema_version_id: CurrentGraphSchemaVersion
    suggested_action: Literal["recheck", "recalculate", "refresh"]


class GraphChangeReviewContract(GraphContract):
    change_id: str = Field(min_length=1, max_length=240)
    decided_at: datetime
    draft_version: str = Field(min_length=1, max_length=80)
    reviewer: str = Field(min_length=1, max_length=120)


class GraphImpactDecisionContract(GraphContract):
    action: Literal["recheck", "recalculate", "refresh"]
    decided_at: datetime
    draft_version: str = Field(min_length=1, max_length=80)
    reference_id: str = Field(min_length=1, max_length=160)
    reviewer: str = Field(min_length=1, max_length=120)


class GraphVersionContract(GraphContract):
    base_version: str | None = Field(default=None, max_length=80)
    name: str = Field(min_length=1, max_length=80)
    status: Literal["published", "draft"]


class AbilityGraphStateContract(GraphContract):
    change_reviews: list[GraphChangeReviewContract]
    downstream_references: list[GraphDownstreamReferenceContract]
    edges: list[GraphEdgeContract]
    impact_decisions: list[GraphImpactDecisionContract]
    nodes: list[GraphNodeContract]
    published_snapshots: list[GraphPublishedSnapshotContract]
    schema_version_id: CurrentGraphSchemaVersion
    version: GraphVersionContract


class SaveGraphDraftRequest(GraphContract):
    expected_revision: int = Field(ge=0)
    state: AbilityGraphStateContract


class GraphRevisionCommandRequest(GraphContract):
    expected_revision: int = Field(ge=1)


class GraphWorkspaceResponse(GraphContract):
    revision: int = Field(ge=1)
    state: AbilityGraphStateContract
    updated_at: datetime
    updated_by: str

    @classmethod
    def from_workspace(cls, workspace: GraphWorkspace) -> "GraphWorkspaceResponse":
        return cls(
            revision=workspace.revision,
            state=AbilityGraphStateContract.model_validate(workspace.state),
            updated_at=workspace.updated_at,
            updated_by=workspace.updated_by,
        )


class GraphAuditEventResponse(GraphContract):
    action: str
    actor: str
    created_at: datetime
    graph_version: str
    id: str
    revision: int
    summary: str

    @classmethod
    def from_event(cls, event: GraphAuditEvent) -> "GraphAuditEventResponse":
        return cls(
            action=event.action,
            actor=event.actor,
            created_at=event.created_at,
            graph_version=event.graph_version,
            id=event.id,
            revision=event.revision,
            summary=event.summary,
        )


class GraphAuditEventListResponse(GraphContract):
    items: list[GraphAuditEventResponse]
    total: int = Field(ge=0)
