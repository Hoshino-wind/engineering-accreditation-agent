"""叠加识别中心审核决策的图谱 / 覆盖度查询（应用层）。

组合两个来源：编排器的运行图谱状态 + 识别中心候选仓库的审核决策，
经领域投影函数合并后对外提供「当前图谱」「当前覆盖度」。
这样识别中心的每一次采纳 / 驳回都会真实影响图谱与覆盖度计算。
"""

from __future__ import annotations

from datetime import UTC, datetime
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
from app.modules.recognition.domain.candidate import (
    CandidateReviewStatus,
    RecognitionCandidate,
    RecognitionCandidateRisk,
    RecognitionCandidateType,
)


def _clean_alias(value: Any) -> str:
    return str(value or "").strip().lower()


def _node_aliases_by_id(nodes: list[dict[str, Any]]) -> dict[str, set[str]]:
    aliases: dict[str, set[str]] = {}
    for node in nodes:
        node_id = str(node.get("id") or "")
        if not node_id:
            continue
        properties = node.get("properties") or {}
        values = [
            node.get("id"),
            node.get("code"),
            node.get("name"),
            properties.get("code"),
            properties.get("name"),
            properties.get("title"),
            properties.get("label"),
        ]
        alias_set = {_clean_alias(value) for value in values if _clean_alias(value)}
        aliases[node_id] = alias_set or {_clean_alias(node_id)}
    return aliases


def _aliases_for_endpoint(
    endpoint: Any,
    aliases_by_id: dict[str, set[str]],
) -> set[str]:
    raw = str(endpoint or "")
    aliases = {_clean_alias(raw)}
    aliases.update(aliases_by_id.get(raw, set()))
    return {alias for alias in aliases if alias}


def _candidate_matches_edge(
    candidate: RecognitionCandidate,
    edge: dict[str, Any],
    aliases_by_id: dict[str, set[str]],
) -> bool:
    source_aliases = _aliases_for_endpoint(edge.get("source"), aliases_by_id)
    target_aliases = _aliases_for_endpoint(edge.get("target"), aliases_by_id)
    return (
        _clean_alias(candidate.source_node) in source_aliases
        and _clean_alias(candidate.target_node) in target_aliases
    )


def _edge_is_reviewable_candidate(edge: dict[str, Any]) -> bool:
    return (
        edge.get("kind") == "SUPPORTS"
        and edge.get("reviewStatus", "pending") == "pending"
        and edge.get("sourceType", "ai") == "ai"
    )


def _label_for_node(node: dict[str, Any] | None, fallback: Any) -> str:
    if not node:
        return str(fallback or "")
    return str(node.get("name") or node.get("code") or node.get("id") or fallback or "")


def _confidence_score(edge: dict[str, Any]) -> int:
    raw = edge.get("confidence")
    if not isinstance(raw, int | float):
        return 0
    score = raw * 100 if raw <= 1 else raw
    return max(0, min(100, round(score)))


def _candidate_id_for_edge(edge_id: str) -> str:
    safe = "".join(ch if ch.isalnum() or ch in "-_." else "-" for ch in edge_id)
    return f"candidate-reconciled-{safe}"


def _candidate_from_edge(
    edge: dict[str, Any],
    nodes_by_id: dict[str, dict[str, Any]],
) -> RecognitionCandidate:
    edge_id = str(edge.get("id") or f"{edge.get('source')}-{edge.get('target')}")
    source_node = nodes_by_id.get(str(edge.get("source") or ""))
    target_node = nodes_by_id.get(str(edge.get("target") or ""))
    source_label = _label_for_node(source_node, edge.get("source"))
    target_label = _label_for_node(target_node, edge.get("target"))
    confidence = _confidence_score(edge)
    source_properties = source_node.get("properties") if source_node else {}
    course = ""
    if isinstance(source_properties, dict):
        course = str(
            source_properties.get("course")
            or source_properties.get("courseName")
            or source_properties.get("course_name")
            or ""
        )
    if not course and source_node and source_node.get("kind") == "Course":
        course = source_label

    return RecognitionCandidate(
        id=_candidate_id_for_edge(edge_id),
        title=f"{source_label} 支撑 {target_label}",
        course=course,
        candidate_type=RecognitionCandidateType.RELATION,
        confidence=confidence,
        risk=(
            RecognitionCandidateRisk.LOW_CONFIDENCE
            if confidence and confidence < 70
            else RecognitionCandidateRisk.NORMAL
        ),
        source_node=str(edge.get("source") or source_label),
        relation="支撑",
        target_node=str(edge.get("target") or target_label),
        explanation=str(edge.get("reasoning") or "由图谱待审核关系自动补齐，供教师继续审核。"),
        processor_version="graph-reconcile-v1",
        generated_at=datetime.now(UTC).strftime("%Y-%m-%d %H:%M"),
        review_status=CandidateReviewStatus.PENDING,
    )


async def reconcile_orphan_pending_edges(
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    candidates_repo: CandidateRepository,
    *,
    existing_candidates: list[RecognitionCandidate] | None = None,
) -> list[RecognitionCandidate]:
    candidates = (
        list(existing_candidates)
        if existing_candidates is not None
        else await candidates_repo.list_all()
    )
    aliases_by_id = _node_aliases_by_id(nodes)
    nodes_by_id = {str(node.get("id")): node for node in nodes if node.get("id")}
    existing_ids = {candidate.id for candidate in candidates}
    missing: list[RecognitionCandidate] = []

    for edge in edges:
        if not _edge_is_reviewable_candidate(edge):
            continue
        edge_id = str(edge.get("id") or f"{edge.get('source')}-{edge.get('target')}")
        candidate_id = _candidate_id_for_edge(edge_id)
        if candidate_id in existing_ids:
            continue
        if any(
            _candidate_matches_edge(candidate, edge, aliases_by_id)
            for candidate in [*candidates, *missing]
        ):
            continue
        missing.append(_candidate_from_edge(edge, nodes_by_id))
        existing_ids.add(candidate_id)

    if missing:
        await candidates_repo.add_many(missing)
        candidates.extend(missing)
    return candidates


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
        nodes = list(base.get("nodes", []))
        edges = list(base.get("edges", []))
        candidates = await reconcile_orphan_pending_edges(
            nodes,
            edges,
            self._candidates,
        )
        return apply_review_decisions(
            nodes,
            edges,
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
