from app.modules.graph.application.ports import AbilityGraphRepository
from app.modules.graph.domain import AbilityGraph, AbilityGraphEdge


class GetAbilityGraph:
    def __init__(self, repository: AbilityGraphRepository) -> None:
        self._repository = repository

    async def execute(self) -> AbilityGraph:
        return await self._repository.get_graph()


class ReviewGraphEdge:
    def __init__(self, repository: AbilityGraphRepository) -> None:
        self._repository = repository

    async def execute(self, edge_id: str, decision: str) -> AbilityGraphEdge | None:
        return await self._repository.review_edge(edge_id, decision)

