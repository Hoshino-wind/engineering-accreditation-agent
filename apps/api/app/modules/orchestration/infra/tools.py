"""编排模块工具与转换辅助。

包含：图谱在 LangGraph 状态中的序列化/反序列化、各专项智能体调用 LLM 工具前的输入构造、
以及步骤日志构造。这些把「LLM 能力 / 覆盖度计算 / RAG」包装为智能体可调用的工具。
"""

from datetime import UTC, datetime
from typing import Any

from app.modules.llm.domain.models import RelationItem
from app.modules.orchestration.domain.models import (
    AbilityGraph,
    AgentPhase,
    CoverageReport,
    GraphEdge,
    GraphNode,
    StepStatus,
)


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def make_step(
    phase: AgentPhase,
    agent: str,
    title: str,
    status: StepStatus,
    summary: str = "",
    tool_calls: list[dict[str, Any]] | None = None,
    started_at: str | None = None,
    finished_at: str | None = None,
) -> dict[str, Any]:
    return {
        "phase": phase.value,
        "agent": agent,
        "title": title,
        "status": status.value,
        "summary": summary,
        "startedAt": started_at,
        "finishedAt": finished_at,
        "toolCalls": tool_calls or [],
    }


def make_tool_call(
    tool: str,
    agent: str,
    status: StepStatus,
    summary: str = "",
    latency_ms: int = 0,
    detail: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "tool": tool,
        "agent": agent,
        "status": status.value,
        "summary": summary,
        "latencyMs": latency_ms,
        "detail": detail or {},
    }


# ── 图谱序列化 ──────────────────────────────────────────


def graph_to_state(graph: AbilityGraph) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    return [n.to_dict() for n in graph.nodes], [e.to_dict() for e in graph.edges]


def node_from_dict(d: dict[str, Any]) -> GraphNode:
    return GraphNode.from_dict(d)


def edge_from_dict(d: dict[str, Any]) -> GraphEdge:
    return GraphEdge.from_dict(d)


def state_to_graph(
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
) -> AbilityGraph:
    return AbilityGraph(nodes=[node_from_dict(n) for n in nodes], edges=[edge_from_dict(e) for e in edges])


# ── 关系推理输入 / 输出 ─────────────────────────────────


def school_node_dicts(nodes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "id": n["id"],
            "name": n["name"],
            "kind": n["kind"],
            "code": n["code"],
            "description": n.get("description"),
            "properties": n.get("properties") or {},
        }
        for n in nodes
        if n.get("origin") == "school"
    ]


def standard_node_dicts(nodes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {"id": n["id"], "name": n["name"], "code": n["code"], "kind": n["kind"]}
        for n in nodes
        if n.get("origin") == "standard" and n.get("kind") == "Competency"
    ]


def _resolve_node_ref(ref: str, nodes: list[dict[str, Any]]) -> str:
    """把 LLM 返回的节点引用（可能是 id / code / name）解析为真实节点 id。

    第二遍忽略大小写：LLM 输出的引用可能与节点 code 大小写不一致
    （如 'co-ds' vs 'CO-DS'），兜底解析避免生成悬空边。
    """
    ref_lower = ref.lower()
    for node in nodes:
        if node.get("id") == ref:
            return node["id"]
    for node in nodes:
        if node.get("code") == ref:
            return node["id"]
    for node in nodes:
        if node.get("name") == ref:
            return node["id"]
    for node in nodes:
        if str(node.get("id") or "").lower() == ref_lower:
            return node["id"]
    for node in nodes:
        if str(node.get("code") or "").lower() == ref_lower:
            return node["id"]
    for node in nodes:
        if str(node.get("name") or "").lower() == ref_lower:
            return node["id"]
    return ref


def relations_to_pending_edges(
    relations: list[RelationItem],
    nodes: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """把 LLM 推断的关系转为待审核边。

    边 id 必须包含随机后缀：LLM 可能在不同运行中对同一 (source, target)
    重复推断，若 id 固定，后一次运行的 pending 边会覆盖前一次已审核的
    边（approved/rejected 状态丢失）。随机后缀保证每次推断是独立证据。
    """
    import uuid

    edges: list[dict[str, Any]] = []
    for rel in relations:
        source = _resolve_node_ref(rel.source_id, nodes)
        target = _resolve_node_ref(rel.target_id, nodes)
        edges.append(
            {
                "id": f"ai-rel-{uuid.uuid4().hex[:8]}-{source}-{target}",
                "source": source,
                "target": target,
                "kind": "SUPPORTS",
                "sourceType": "ai",
                "reviewStatus": "pending",
                "strength": rel.strength,
                "confidence": rel.confidence,
                "reasoning": rel.reasoning,
            }
        )
    return edges


def without_superseded_material_version(
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    *,
    version_group_id: str,
    current_resource_id: str,
    material_names: set[str] | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """移除同版本组旧引用；旧格式图谱回退按材料名识别。"""
    normalized_names = {
        name.strip().casefold()
        for name in material_names or set()
        if name and name.strip()
    }
    removed_node_ids: set[str] = set()
    next_nodes: list[dict[str, Any]] = []
    for node in nodes:
        if node.get("origin") != "school":
            next_nodes.append(node)
            continue
        properties = dict(node.get("properties") or {})
        refs = [
            dict(ref)
            for ref in properties.get("materialRefs", [])
            if isinstance(ref, dict)
        ]
        stale_refs = [
            ref
            for ref in refs
            if ref.get("versionGroupId") == version_group_id
            and ref.get("resourceId") != current_resource_id
        ]
        if stale_refs:
            active_refs = [ref for ref in refs if ref not in stale_refs]
            if not active_refs:
                removed_node_ids.add(str(node.get("id") or ""))
                continue
            active = active_refs[-1]
            properties.update(
                {
                    "materialRefs": active_refs,
                    "materialId": active.get("resourceId", ""),
                    "materialVersionGroupId": active.get("versionGroupId", ""),
                    "materialVersion": active.get("version", ""),
                    "materialName": active.get("name", ""),
                    "materialFileName": active.get("fileName", ""),
                }
            )
            next_nodes.append({**node, "properties": properties})
            continue

        direct_group = str(properties.get("materialVersionGroupId") or "")
        direct_id = str(properties.get("materialId") or "")
        legacy_names = {
            str(properties.get(key) or "").strip().casefold()
            for key in ("materialName", "materialFileName", "resourceName")
            if str(properties.get(key) or "").strip()
        }
        legacy_match = not refs and not direct_id and bool(legacy_names & normalized_names)
        if (
            direct_group == version_group_id
            and direct_id != current_resource_id
        ) or legacy_match:
            removed_node_ids.add(str(node.get("id") or ""))
            continue
        next_nodes.append(node)

    next_edges: list[dict[str, Any]] = []
    for edge in edges:
        if edge.get("source") in removed_node_ids or edge.get("target") in removed_node_ids:
            continue
        refs = [
            dict(ref)
            for ref in edge.get("materialRefs", [])
            if isinstance(ref, dict)
        ]
        active_refs = [
            ref
            for ref in refs
            if not (
                ref.get("versionGroupId") == version_group_id
                and ref.get("resourceId") != current_resource_id
            )
        ]
        if refs:
            if not active_refs:
                continue
            next_edges.append({**edge, "materialRefs": active_refs})
            continue
        if (
            edge.get("materialVersionGroupId") == version_group_id
            and edge.get("materialResourceId") != current_resource_id
        ):
            continue
        next_edges.append(edge)
    return next_nodes, next_edges


# ── 覆盖度下游输入构造 ──────────────────────────────────


def build_gap_facts(coverage: CoverageReport) -> list[dict[str, Any]]:
    facts: list[dict[str, Any]] = []
    for comp in coverage.competencies:
        if comp.status == "covered":
            continue
        if comp.supporter_count == 0:
            reason = "无任何已审核支撑关系"
        elif comp.evidence_source_count < 2:
            reason = "独立材料证据不足 2 份"
        else:
            reason = "累计支撑强度不足 4 分"
        facts.append(
            {
                "code": comp.code,
                "name": comp.name,
                "type": "standard_indicator",
                "status": comp.status,
                "attainment": round(comp.attainment, 3),
                "requirement_code": comp.requirement_code,
                "rule_based_explanation": (
                    f"能力指标「{comp.name}」（{comp.code}）当前状态为 {comp.status}，"
                    f"达成度 {round(comp.attainment * 100)}%，{reason}。"
                ),
                "evidence_refs": comp.supporters,
            }
        )
    return facts


def build_suggestion_gaps(coverage: CoverageReport) -> list[dict[str, Any]]:
    gaps: list[dict[str, Any]] = []
    for comp in coverage.competencies:
        if comp.status == "covered":
            continue
        gaps.append(
            {
                "code": comp.code,
                "name": comp.name,
                "type": "standard_indicator",
                "status": comp.status,
                "attainment": round(comp.attainment, 3),
                "target": 0.7,
                "requirement_code": comp.requirement_code,
            }
        )
    return gaps


def build_report_context(
    coverage: CoverageReport,
    suggestions: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    suggestions = suggestions or []
    context: list[dict[str, Any]] = []
    for req in coverage.requirements:
        improvements = [
            s.get("suggestion", "")
            for s in suggestions
            if s.get("targetCode") in {c.code for c in coverage.competencies if c.requirement_code == req.code}
        ]
        context.append(
            {
                "requirement_code": req.code,
                "requirement_name": req.name,
                "coverage_rate": round(req.coverage_rate, 3),
                "attainment": round(req.coverage_rate, 3),
                "supporting_courses": req.supporting_courses,
                "improvements": improvements,
            }
        )
    return context
