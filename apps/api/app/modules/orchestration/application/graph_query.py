"""叠加识别中心审核决策的图谱 / 覆盖度查询（应用层）。

组合两个来源：编排器的运行图谱状态 + 识别中心候选仓库的审核决策，
经领域投影函数合并后对外提供「当前图谱」「当前覆盖度」。
这样识别中心的每一次采纳 / 驳回都会真实影响图谱与覆盖度计算。
"""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime
from typing import Any, Protocol

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
    CandidateEvidence,
    CandidateReviewStatus,
    RecognitionCandidate,
    RecognitionCandidateRisk,
    RecognitionCandidateType,
)


class _ResourceReader(Protocol):
    async def list_all(
        self,
        *,
        course: str | None = None,
        status: str | None = None,
        resource_type: str | None = None,
        major_id: str | None = None,
    ) -> list[Any]: ...


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
    endpoint_match = (
        _clean_alias(candidate.source_node) in source_aliases
        and _clean_alias(candidate.target_node) in target_aliases
    )
    if not endpoint_match:
        return False

    edge_resource_id = str(edge.get("materialResourceId") or "")
    candidate_resource_ids = {
        str(evidence.resource_id or "")
        for evidence in candidate.evidence
        if evidence.resource_id
    }
    if edge_resource_id:
        return edge_resource_id in candidate_resource_ids
    return True


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


def _course_node_id(course_name: str) -> str:
    digest = hashlib.sha1(course_name.strip().encode("utf-8")).hexdigest()[:8]
    return f"ext-course-{digest}"


def _resource_node_id(resource_id: str) -> str:
    digest = hashlib.sha1(resource_id.strip().encode("utf-8")).hexdigest()[:10]
    return f"ext-resource-{digest}"


def _node_refs_resource(node: dict[str, Any], resource_id: str) -> bool:
    properties = node.get("properties") or {}
    if str(properties.get("materialId") or "") == resource_id:
        return True
    if str(properties.get("resourceId") or "") == resource_id:
        return True
    refs = properties.get("materialRefs") or []
    if isinstance(refs, list):
        return any(str(ref.get("resourceId") or "") == resource_id for ref in refs if isinstance(ref, dict))
    return False


def _candidate_from_edge(
    edge: dict[str, Any],
    nodes_by_id: dict[str, dict[str, Any]],
    course_by_source_id: dict[str, str],
    major_id: str,
    course_by_resource_id: dict[str, str] | None = None,
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
    if not course:
        course = course_by_source_id.get(str(edge.get("source") or ""), "")

    material_name = str(edge.get("materialName") or "")
    material_resource_id = str(edge.get("materialResourceId") or "")
    material_version = str(edge.get("materialVersion") or "")
    if material_resource_id and course_by_resource_id:
        course = course_by_resource_id.get(material_resource_id, course)
    evidence = ()
    if material_name or material_resource_id:
        evidence = (
            CandidateEvidence(
                id=f"evidence-{_candidate_id_for_edge(edge_id)}",
                resource_name=material_name,
                resource_version=material_version,
                coordinate="graph-reconciliation",
                excerpt=str(edge.get("reasoning") or "")[:200],
                hash="graph-edge",
                resource_id=material_resource_id,
            ),
        )

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
        major_id=major_id,
        review_status=CandidateReviewStatus.PENDING,
        evidence=evidence,
    )


async def reconcile_orphan_pending_edges(
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    candidates_repo: CandidateRepository,
    *,
    existing_candidates: list[RecognitionCandidate] | None = None,
    major_id: str = "major-eie",
    course_by_resource_id: dict[str, str] | None = None,
) -> list[RecognitionCandidate]:
    candidates = (
        list(existing_candidates)
        if existing_candidates is not None
        else await candidates_repo.list_all(major_id=major_id)
    )
    aliases_by_id = _node_aliases_by_id(nodes)
    nodes_by_id = {str(node.get("id")): node for node in nodes if node.get("id")}
    course_by_source_id: dict[str, str] = {}
    for edge in edges:
        if edge.get("kind") != "BELONGS_TO":
            continue
        course_node = nodes_by_id.get(str(edge.get("target") or ""))
        if course_node is None:
            continue
        course_by_source_id[str(edge.get("source") or "")] = _label_for_node(
            course_node, edge.get("target")
        )
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
        missing.append(
            _candidate_from_edge(
                edge,
                nodes_by_id,
                course_by_source_id,
                major_id,
                course_by_resource_id,
            )
        )
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
        resources: _ResourceReader | None = None,
        major_id: str = "major-eie",
    ) -> None:
        self._orchestrator = orchestrator
        self._candidates = candidates
        self._resources = resources
        self._major_id = major_id

    async def _has_materials(self) -> bool:
        if self._resources is None:
            return True
        resources = await self._resources.list_all(major_id=self._major_id)
        return bool(resources)

    async def _course_by_resource_id(self) -> dict[str, str]:
        if self._resources is None:
            return {}
        resources = await self._resources.list_all(major_id=self._major_id)
        return {
            str(resource.id): str(resource.course or "")
            for resource in resources
            if getattr(resource, "id", None)
        }

    async def _resources_for_major(self) -> list[Any]:
        if self._resources is None:
            return []
        return await self._resources.list_all(major_id=self._major_id)

    @staticmethod
    def _apply_material_course_scope(
        nodes: list[dict[str, Any]],
        edges: list[dict[str, Any]],
        course_by_resource_id: dict[str, str],
    ) -> None:
        if not course_by_resource_id:
            return
        node_by_id = {str(node.get("id") or ""): node for node in nodes}
        existing_edge_ids = {str(edge.get("id") or "") for edge in edges}
        for edge in edges:
            resource_id = str(edge.get("materialResourceId") or "")
            course = course_by_resource_id.get(resource_id)
            if not course:
                continue
            source_id = str(edge.get("source") or "")
            source_node = node_by_id.get(source_id)
            if source_node is None or source_node.get("origin") != "school":
                continue
            properties = dict(source_node.get("properties") or {})
            properties["courseName"] = course
            properties["materialCourse"] = course
            source_node["properties"] = properties
            if source_node.get("kind") != "Experiment":
                continue

            course_id = next(
                (
                    str(node.get("id") or "")
                    for node in nodes
                    if node.get("kind") == "Course"
                    and (
                        str(node.get("name") or "").strip() == course
                        or str((node.get("properties") or {}).get("courseName") or "").strip()
                        == course
                    )
                ),
                "",
            )
            if not course_id:
                course_id = _course_node_id(course)
                course_node = {
                    "id": course_id,
                    "kind": "Course",
                    "code": f"COURSE-{hashlib.sha1(course.encode('utf-8')).hexdigest()[:8].upper()}",
                    "name": course,
                    "origin": "school",
                    "description": f"上传材料时选择的课程：{course}",
                    "properties": {
                        "source": "material-course-scope",
                        "courseName": course,
                        "materialCourse": course,
                    },
                }
                nodes.append(course_node)
                node_by_id[course_id] = course_node

            belongs_edge_id = f"edge-belongs-{source_id}-{course_id}"
            if belongs_edge_id not in existing_edge_ids:
                edges.append(
                    {
                        "id": belongs_edge_id,
                        "source": source_id,
                        "target": course_id,
                        "kind": "BELONGS_TO",
                        "sourceType": "rule",
                        "reviewStatus": "approved",
                        "reasoning": "按材料上传时选择的课程补齐实验归属。",
                        "materialResourceId": resource_id,
                    }
                )
                existing_edge_ids.add(belongs_edge_id)

    @staticmethod
    def _apply_material_resource_projection(
        nodes: list[dict[str, Any]],
        edges: list[dict[str, Any]],
        resources: list[Any],
    ) -> None:
        node_by_id = {str(node.get("id") or ""): node for node in nodes}
        existing_edge_ids = {str(edge.get("id") or "") for edge in edges}

        for resource in resources:
            resource_id = str(getattr(resource, "id", "") or "").strip()
            course = str(getattr(resource, "course", "") or "").strip()
            if not resource_id or not course:
                continue

            course_id = next(
                (
                    str(node.get("id") or "")
                    for node in nodes
                    if node.get("kind") == "Course"
                    and (
                        str(node.get("name") or "").strip() == course
                        or str((node.get("properties") or {}).get("courseName") or "").strip()
                        == course
                    )
                ),
                "",
            )
            if not course_id:
                course_id = _course_node_id(course)
                course_node = {
                    "id": course_id,
                    "kind": "Course",
                    "code": f"COURSE-{hashlib.sha1(course.encode('utf-8')).hexdigest()[:8].upper()}",
                    "name": course,
                    "origin": "school",
                    "description": f"Material upload course: {course}",
                    "properties": {
                        "source": "material-resource-projection",
                        "courseName": course,
                        "materialCourse": course,
                    },
                }
                nodes.append(course_node)
                node_by_id[course_id] = course_node

            resource_node = next(
                (node for node in nodes if _node_refs_resource(node, resource_id)),
                None,
            )
            if resource_node is None:
                resource_node_id = _resource_node_id(resource_id)
                resource_node = {
                    "id": resource_node_id,
                    "kind": "TeachingResource",
                    "code": f"RES-{hashlib.sha1(resource_id.encode('utf-8')).hexdigest()[:8].upper()}",
                    "name": str(getattr(resource, "name", "") or getattr(resource, "file_name", "") or resource_id),
                    "origin": "school",
                    "description": str(getattr(resource, "file_name", "") or ""),
                    "properties": {
                        "source": "material-resource-projection",
                        "resourceId": resource_id,
                        "resourceName": str(getattr(resource, "name", "") or ""),
                        "fileName": str(getattr(resource, "file_name", "") or ""),
                        "courseName": course,
                        "materialCourse": course,
                        "materialId": resource_id,
                        "materialRefs": [
                            {
                                "resourceId": resource_id,
                                "versionGroupId": str(getattr(resource, "version_group_id", "") or resource_id),
                                "version": str(getattr(resource, "version", "") or ""),
                                "name": str(getattr(resource, "name", "") or ""),
                                "fileName": str(getattr(resource, "file_name", "") or ""),
                                "course": course,
                            }
                        ],
                    },
                }
                nodes.append(resource_node)
                node_by_id[resource_node_id] = resource_node
            else:
                resource_node_id = str(resource_node.get("id") or "")
                properties = dict(resource_node.get("properties") or {})
                properties["courseName"] = course
                properties["materialCourse"] = course
                resource_node["properties"] = properties

            belongs_edge_id = f"edge-resource-belongs-{resource_node_id}-{course_id}"
            if belongs_edge_id not in existing_edge_ids:
                edges.append(
                    {
                        "id": belongs_edge_id,
                        "source": resource_node_id,
                        "target": course_id,
                        "kind": "BELONGS_TO",
                        "sourceType": "rule",
                        "reviewStatus": "approved",
                        "reasoning": "Material belongs to the upload-selected course.",
                        "materialResourceId": resource_id,
                        "materialName": str(getattr(resource, "name", "") or ""),
                    }
                )
                existing_edge_ids.add(belongs_edge_id)

    async def _merged_graph(self) -> dict[str, list[dict[str, Any]]]:
        if not await self._has_materials():
            return {"nodes": [], "edges": []}
        base = await self._orchestrator.get_current_graph()
        nodes = list(base.get("nodes", []))
        edges = list(base.get("edges", []))
        resources = await self._resources_for_major()
        course_by_resource_id = {
            str(resource.id): str(resource.course or "")
            for resource in resources
            if getattr(resource, "id", None)
        }
        self._apply_material_course_scope(nodes, edges, course_by_resource_id)
        self._apply_material_resource_projection(nodes, edges, resources)
        candidates = await reconcile_orphan_pending_edges(
            nodes,
            edges,
            self._candidates,
            major_id=self._major_id,
            course_by_resource_id=course_by_resource_id,
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
