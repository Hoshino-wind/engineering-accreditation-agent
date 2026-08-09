"""叠加识别中心审核决策的图谱 / 覆盖度查询（应用层）。

组合两个来源：编排器的运行图谱状态 + 识别中心候选仓库的审核决策，
经领域投影函数合并后对外提供「当前图谱」「当前覆盖度」。
这样识别中心的每一次采纳 / 驳回都会真实影响图谱与覆盖度计算。
"""

from __future__ import annotations

from typing import Any

from app.modules.orchestration.application.ports import AgentOrchestratorPort
from app.modules.orchestration.domain.coverage import analyze_coverage
from app.modules.orchestration.domain.models import (
    AbilityGraph,
    GraphEdge,
    GraphNode,
)
from app.modules.orchestration.domain.projection import apply_review_decisions
from app.modules.recognition.application.ports import CandidateRepository


class QueryProjectedGraph:
    """当前图谱 / 覆盖度 = 运行图谱状态 ⊕ 识别中心审核决策投影。"""

    def __init__(
        self,
        orchestrator: AgentOrchestratorPort,
        candidates: CandidateRepository,
    ) -> None:
        self._orchestrator = orchestrator
        self._candidates = candidates

    async def _merged_graph(self) -> dict[str, list[dict[str, Any]]]:
        base = await self._orchestrator.get_current_graph()
        candidates = await self._candidates.list_all()
        return apply_review_decisions(
            list(base.get("nodes", [])),
            list(base.get("edges", [])),
            candidates,
        )

    async def current_graph(self) -> dict[str, list[dict[str, Any]]]:
        return await self._merged_graph()

    async def current_coverage(self) -> dict[str, Any]:
        merged = await self._merged_graph()
        graph = AbilityGraph(
            nodes=[GraphNode.from_dict(n) for n in merged["nodes"]],
            edges=[GraphEdge.from_dict(e) for e in merged["edges"]],
        )
        return analyze_coverage(graph).to_dict()
