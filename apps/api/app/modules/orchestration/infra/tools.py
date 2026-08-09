"""编排模块工具与转换辅助。

包含：图谱在 LangGraph 状态中的序列化/反序列化、各专项智能体调用 LLM 工具前的输入构造、
以及步骤日志构造。这些把「LLM 能力 / 覆盖度计算 / RAG」包装为智能体可调用的工具。
"""

from datetime import datetime, timezone
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
    return datetime.now(timezone.utc).isoformat()


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
        {"id": n["id"], "name": n["name"], "kind": n["kind"], "code": n["code"]}
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
    """把 LLM 返回的节点引用（可能是 id / code / name）解析为真实节点 id。"""
    for node in nodes:
        if node.get("id") == ref:
            return node["id"]
    for node in nodes:
        if node.get("code") == ref:
            return node["id"]
    for node in nodes:
        if node.get("name") == ref:
            return node["id"]
    return ref


def relations_to_pending_edges(
    relations: list[RelationItem],
    nodes: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    edges: list[dict[str, Any]] = []
    for i, rel in enumerate(relations):
        source = _resolve_node_ref(rel.source_id, nodes)
        target = _resolve_node_ref(rel.target_id, nodes)
        edges.append(
            {
                "id": f"ai-rel-{i}-{source}-{target}",
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


# ── 覆盖度下游输入构造 ──────────────────────────────────


def build_gap_facts(coverage: CoverageReport) -> list[dict[str, Any]]:
    facts: list[dict[str, Any]] = []
    for comp in coverage.competencies:
        if comp.status == "covered":
            continue
        reason = "无任何已审核支撑关系" if comp.supporter_count == 0 else "支撑强度不足（弱支撑/仅待审核）"
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
