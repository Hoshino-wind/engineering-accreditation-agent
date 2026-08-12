"""读取由正式图谱与评价策略共同决定的评价来源。"""

from dataclasses import dataclass

from app.modules.evaluations.application.graph_source_ports import (
    EvaluationPolicyRepository,
    PublishedGraphRepository,
)
from app.modules.evaluations.domain import (
    BoundEvaluationSource,
    EvaluationPolicyVersion,
    bind_evaluation_sources,
    derive_evaluation_structure,
)


class PublishedGraphUnavailableError(LookupError):
    """尚无已发布图谱版本，评价没有可用结构。"""


class EvaluationPolicyUnavailableError(LookupError):
    """尚无生效评价策略版本，权重与阈值无从取得。"""


@dataclass(frozen=True, slots=True)
class GraphEvaluationSourcesView:
    graph_version: str
    schema_version_id: str
    published_at: str
    policy_version: str
    sources: tuple[BoundEvaluationSource, ...]

    @property
    def ready_count(self) -> int:
        return sum(1 for item in self.sources if item.ready)


class GetGraphEvaluationSources:
    def __init__(
        self,
        graph_repository: PublishedGraphRepository,
        policy_repository: EvaluationPolicyRepository,
    ) -> None:
        self._graph_repository = graph_repository
        self._policy_repository = policy_repository

    async def run(self) -> GraphEvaluationSourcesView:
        snapshot = await self._graph_repository.get_published_snapshot()
        if snapshot is None:
            raise PublishedGraphUnavailableError
        policy = await self._policy_repository.get_active_policy()
        if policy is None:
            raise EvaluationPolicyUnavailableError
        if not isinstance(policy, EvaluationPolicyVersion):
            raise EvaluationPolicyUnavailableError

        structure = derive_evaluation_structure(snapshot)
        return GraphEvaluationSourcesView(
            graph_version=structure.graph_version,
            schema_version_id=structure.schema_version_id,
            published_at=structure.published_at,
            policy_version=policy.policy_version,
            sources=bind_evaluation_sources(structure, policy),
        )


__all__ = [
    "EvaluationPolicyUnavailableError",
    "GetGraphEvaluationSources",
    "GraphEvaluationSourcesView",
    "PublishedGraphUnavailableError",
]
