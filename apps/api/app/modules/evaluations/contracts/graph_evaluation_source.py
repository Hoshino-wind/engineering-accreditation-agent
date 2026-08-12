"""图谱派生评价来源的读契约。"""

from pydantic import BaseModel, ConfigDict

from app.modules.evaluations.application import GraphEvaluationSourcesView
from app.modules.evaluations.contracts.evaluation_run_reference import to_camel
from app.modules.evaluations.domain import BoundCriterion, BoundEvaluationSource


class GraphEvaluationContract(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        extra="forbid",
        populate_by_name=True,
    )


class BoundCriterionResponse(GraphEvaluationContract):
    criterion_id: str
    label: str
    evidence_name: str
    edge_version_id: str
    weight: float | None
    blockers: list[str]

    @classmethod
    def from_domain(cls, item: BoundCriterion) -> "BoundCriterionResponse":
        return cls(
            criterion_id=item.criterion_id,
            label=item.label,
            evidence_name=item.evidence_name,
            edge_version_id=item.edge_version_id,
            weight=None if item.weight is None else float(item.weight),
            blockers=list(item.blockers),
        )


class GraphEvaluationSourceResponse(GraphEvaluationContract):
    """一条"课程目标 → 指标点"的评价来源。

    ``ready`` 为假时 ``blockers`` 说明缺什么。缺正式关系回 M2，
    缺权重绑定回 M6 策略——两者不可互相代写。
    """

    course_outcome_id: str
    objective_code: str
    objective_name: str
    course_name: str
    indicator_code: str
    indicator_name: str
    ability_code: str
    ability_name: str
    graph_version: str
    policy_version: str
    threshold: float
    ready: bool
    criteria: list[BoundCriterionResponse]
    blockers: list[str]

    @classmethod
    def from_domain(cls, item: BoundEvaluationSource) -> "GraphEvaluationSourceResponse":
        return cls(
            course_outcome_id=item.course_outcome_id,
            objective_code=item.objective_code,
            objective_name=item.objective_name,
            course_name=item.course_name,
            indicator_code=item.indicator_code,
            indicator_name=item.indicator_name,
            ability_code=item.ability_code,
            ability_name=item.ability_name,
            graph_version=item.graph_version,
            policy_version=item.policy_version,
            threshold=float(item.threshold),
            ready=item.ready,
            criteria=[BoundCriterionResponse.from_domain(entry) for entry in item.criteria],
            blockers=list(item.blockers),
        )


class GraphEvaluationSourcesResponse(GraphEvaluationContract):
    graph_version: str
    schema_version_id: str
    published_at: str
    policy_version: str
    ready_count: int
    sources: list[GraphEvaluationSourceResponse]

    @classmethod
    def from_view(cls, view: GraphEvaluationSourcesView) -> "GraphEvaluationSourcesResponse":
        return cls(
            graph_version=view.graph_version,
            schema_version_id=view.schema_version_id,
            published_at=view.published_at,
            policy_version=view.policy_version,
            ready_count=view.ready_count,
            sources=[
                GraphEvaluationSourceResponse.from_domain(item) for item in view.sources
            ],
        )


__all__ = [
    "BoundCriterionResponse",
    "GraphEvaluationSourceResponse",
    "GraphEvaluationSourcesResponse",
]
