"""多智能体协作图（LangGraph StateGraph）。

拓扑：Supervisor 规划 → 提取智能体 → 关系推理智能体 → 人工审核网关（interrupt 人在回路）
→ 覆盖度分析智能体 → 诊断智能体 → 改进智能体 → 报告智能体。

每个节点是一个专项智能体，调用封装好的「工具」（LLM 能力 / 覆盖度纯函数 / RAG），
并把结果写回共享的 AgentState；checkpointer 提供跨阶段的状态/记忆与中断恢复能力。
"""

from typing import Any, TypedDict

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import interrupt

from app.modules.llm.application.ports import LLMClientPort
from app.modules.llm.application.rag_port import RAGSearchPort
from app.modules.orchestration.domain.coverage import analyze_coverage
from app.modules.orchestration.domain.models import AgentPhase, StepStatus
from app.modules.orchestration.infra.seed_graph import build_seed_graph
from app.modules.orchestration.infra.tools import (
    build_gap_facts,
    build_report_context,
    build_suggestion_gaps,
    graph_to_state,
    make_step,
    make_tool_call,
    relations_to_pending_edges,
    school_node_dicts,
    standard_node_dicts,
    state_to_graph,
)


class AgentState(TypedDict, total=False):
    goal: str
    material_category: str
    material_name: str
    material_text: str
    plan: list[str]
    graph_nodes: list[dict[str, Any]]
    graph_edges: list[dict[str, Any]]
    extracted: list[dict[str, Any]]
    relations: list[dict[str, Any]]
    review_decisions: list[dict[str, Any]]
    coverage: dict[str, Any]
    explanations: list[dict[str, Any]]
    suggestions: list[dict[str, Any]]
    report_chapters: list[dict[str, Any]]
    phase: str
    steps: list[dict[str, Any]]
    error: str


def _prev_steps(state: AgentState) -> list[dict[str, Any]]:
    return list(state.get("steps", []))


def build_agent_graph(llm: LLMClientPort, rag: RAGSearchPort | None = None):
    """构建并编译多智能体协作图。"""

    async def plan_node(state: AgentState) -> dict[str, Any]:
        goal = state.get("goal", "")
        # 优先沿用调用方（orchestrator）注入的当前图谱：多次上传会基于
        # 已持久化的图谱继续生长；直接调用且未注入图谱时才回退种子图。
        nodes_d = list(state.get("graph_nodes") or [])
        edges_d = list(state.get("graph_edges") or [])
        if not nodes_d:
            seed = build_seed_graph()
            nodes_d, edges_d = graph_to_state(seed)
        try:
            plan_resp = await llm.plan(goal)
            plan_titles = [f"{s.phase} · {s.title}" for s in plan_resp.data if s.title]
            tool = make_tool_call(
                "llm.plan", "Supervisor", StepStatus.COMPLETED,
                f"model={plan_resp.model}", plan_resp.latency,
            )
        except Exception as exc:  # noqa: BLE001
            plan_titles = []
            tool = make_tool_call("llm.plan", "Supervisor", StepStatus.FAILED, str(exc))
        if not plan_titles:
            plan_titles = [
                "extract · 提取教学节点",
                "infer · 推断支撑关系",
                "review · 人工审核",
                "coverage · 覆盖度分析",
                "diagnose · 缺口诊断",
                "improve · 改进建议",
                "report · 报告撰写",
            ]
        step = make_step(
            AgentPhase.PLAN, "Supervisor", "规划协作流程", StepStatus.COMPLETED,
            summary=f"生成 {len(plan_titles)} 步协作计划", tool_calls=[tool],
        )
        return {
            "plan": plan_titles,
            "graph_nodes": nodes_d,
            "graph_edges": edges_d,
            "phase": AgentPhase.PLAN.value,
            "steps": _prev_steps(state) + [step],
        }

    async def extract_node(state: AgentState) -> dict[str, Any]:
        category = state.get("material_category") or "培养方案"
        name = state.get("material_name") or "电子信息工程（嵌入式）培养方案"
        text = state.get("material_text") or ""
        try:
            resp = await llm.extract_nodes(text, category, name)
            extracted = [
                {
                    "code": it.code,
                    "name": it.name,
                    "kind": it.kind,
                    "confidence": it.confidence,
                    "description": it.description,
                    "sourceExcerpt": it.source_excerpt,
                }
                for it in resp.data
            ]
            tool = make_tool_call(
                "llm.extract_nodes", "提取智能体", StepStatus.COMPLETED,
                f"model={resp.model}", resp.latency,
            )
        except Exception as exc:  # noqa: BLE001
            extracted = []
            tool = make_tool_call("llm.extract_nodes", "提取智能体", StepStatus.FAILED, str(exc))

        # B2: 把提取出的节点并入图谱（按 code 去重），让图谱随材料"长大"
        kind_map = {
            "course": "Course",
            "experiment": "Experiment",
            "knowledge": "KnowledgePoint",
            "resource": "TeachingResource",
        }
        existing_nodes = list(state.get("graph_nodes", []))
        seen_codes = {n.get("code") for n in existing_nodes}
        new_nodes: list[dict[str, Any]] = []
        for item in extracted:
            code = item.get("code", "")
            if not code or code in seen_codes:
                continue
            seen_codes.add(code)
            new_nodes.append(
                {
                    "id": f"ext-{code.lower()}",
                    "kind": kind_map.get(item.get("kind", ""), "KnowledgePoint"),
                    "code": code,
                    "name": item.get("name", code),
                    "origin": "school",
                    "description": item.get("description"),
                    "properties": {
                        "extracted": True,
                        "confidence": item.get("confidence"),
                        "sourceExcerpt": item.get("sourceExcerpt"),
                        "materialName": name,
                    },
                }
            )

        step = make_step(
            AgentPhase.EXTRACT, "提取智能体", "解析教学材料，提取节点", StepStatus.COMPLETED,
            summary=f"提取 {len(extracted)} 个候选节点，新增入图 {len(new_nodes)} 个",
            tool_calls=[tool],
        )
        return {
            "extracted": extracted,
            "graph_nodes": existing_nodes + new_nodes,
            "phase": AgentPhase.EXTRACT.value,
            "steps": _prev_steps(state) + [step],
        }

    async def infer_node(state: AgentState) -> dict[str, Any]:
        nodes_d = state.get("graph_nodes", [])
        try:
            resp = await llm.infer_relations(school_node_dicts(nodes_d), standard_node_dicts(nodes_d))
            pending = relations_to_pending_edges(resp.data, nodes_d)
            tool = make_tool_call(
                "llm.infer_relations", "关系推理智能体", StepStatus.COMPLETED,
                f"model={resp.model}", resp.latency,
            )
        except Exception as exc:  # noqa: BLE001
            pending = []
            tool = make_tool_call("llm.infer_relations", "关系推理智能体", StepStatus.FAILED, str(exc))
        relations = [
            {
                "id": e["id"],
                "source": e["source"],
                "target": e["target"],
                "strength": e.get("strength"),
                "confidence": e.get("confidence"),
                "reasoning": e.get("reasoning"),
            }
            for e in pending
        ]
        step = make_step(
            AgentPhase.INFER, "关系推理智能体", "推断支撑关系", StepStatus.COMPLETED,
            summary=f"推断 {len(pending)} 条待审核支撑关系", tool_calls=[tool],
        )
        return {
            "relations": relations,
            "graph_edges": state.get("graph_edges", []) + pending,
            "phase": AgentPhase.INFER.value,
            "steps": _prev_steps(state) + [step],
        }

    async def review_node(state: AgentState) -> dict[str, Any]:
        relations = state.get("relations", [])
        # 人在回路：暂停，等待教师对每条推断关系给出 approve/reject
        decisions = interrupt({"pending_review": relations})
        decisions = decisions or []
        dec_map = {d.get("relation_id"): d for d in decisions if isinstance(d, dict)}

        updated_edges: list[dict[str, Any]] = []
        approved = 0
        rejected = 0
        for edge in state.get("graph_edges", []):
            if edge.get("reviewStatus") == "pending" and edge.get("id") in dec_map:
                decision = dec_map[edge["id"]]
                new_status = "approved" if decision.get("decision") == "approved" else "rejected"
                merged = dict(edge)
                merged["reviewStatus"] = new_status
                if decision.get("strength"):
                    merged["strength"] = decision["strength"]
                updated_edges.append(merged)
                if new_status == "approved":
                    approved += 1
                else:
                    rejected += 1
            else:
                updated_edges.append(edge)

        step = make_step(
            AgentPhase.REVIEW, "人工审核网关", "教师审核 AI 推断的关系", StepStatus.COMPLETED,
            summary=f"批准 {approved} 条，驳回 {rejected} 条",
            tool_calls=[
                make_tool_call(
                    "human.review", "人工审核网关", StepStatus.COMPLETED,
                    f"{approved} approved / {rejected} rejected", 0,
                )
            ],
        )
        return {
            "review_decisions": decisions,
            "graph_edges": updated_edges,
            "phase": AgentPhase.REVIEW.value,
            "steps": _prev_steps(state) + [step],
        }

    async def coverage_node(state: AgentState) -> dict[str, Any]:
        graph = state_to_graph(state.get("graph_nodes", []), state.get("graph_edges", []))
        report = analyze_coverage(graph)
        step = make_step(
            AgentPhase.COVERAGE, "覆盖度分析智能体", "计算覆盖度与达成度", StepStatus.COMPLETED,
            summary=(
                f"整体覆盖率 {round(report.overall_coverage_rate * 100)}%，"
                f"覆盖 {report.covered_count} / 部分 {report.partial_count} / 缺口 {report.gap_count}"
            ),
            tool_calls=[
                make_tool_call("analyze_coverage", "覆盖度分析智能体", StepStatus.COMPLETED, "纯规则计算", 0)
            ],
        )
        return {
            "coverage": report.to_dict(),
            "phase": AgentPhase.COVERAGE.value,
            "steps": _prev_steps(state) + [step],
        }

    async def diagnose_node(state: AgentState) -> dict[str, Any]:
        graph = state_to_graph(state.get("graph_nodes", []), state.get("graph_edges", []))
        report = analyze_coverage(graph)
        gap_facts = build_gap_facts(report)
        explanations: list[dict[str, Any]] = []
        if gap_facts:
            rag_context: list[str] | None = None
            if rag is not None:
                try:
                    chunks: list[str] = []
                    for fact in gap_facts[:5]:
                        result = await rag.search(f"{fact['name']} {fact['code']}", top_k=2)
                        chunks.extend(c.text for c in result.chunks)
                    rag_context = chunks or None
                except Exception:  # noqa: BLE001
                    rag_context = None
            try:
                resp = await llm.generate_explanation(gap_facts, rag_context)
                explanations = [
                    {
                        "targetCode": it.target_code,
                        "targetName": it.target_name,
                        "narrative": it.narrative,
                        "evidenceRefs": it.evidence_refs,
                    }
                    for it in resp.data
                ]
                tool = make_tool_call(
                    "llm.generate_explanation", "诊断智能体", StepStatus.COMPLETED,
                    f"model={resp.model}", resp.latency,
                )
            except Exception as exc:  # noqa: BLE001
                tool = make_tool_call("llm.generate_explanation", "诊断智能体", StepStatus.FAILED, str(exc))
        else:
            tool = make_tool_call("llm.generate_explanation", "诊断智能体", StepStatus.SKIPPED, "无缺口，跳过诊断")
        step = make_step(
            AgentPhase.DIAGNOSE, "诊断智能体", "为缺口生成诊断叙述", StepStatus.COMPLETED,
            summary=f"生成 {len(explanations)} 段诊断叙述", tool_calls=[tool],
        )
        return {
            "explanations": explanations,
            "phase": AgentPhase.DIAGNOSE.value,
            "steps": _prev_steps(state) + [step],
        }

    async def improve_node(state: AgentState) -> dict[str, Any]:
        graph = state_to_graph(state.get("graph_nodes", []), state.get("graph_edges", []))
        report = analyze_coverage(graph)
        gaps = build_suggestion_gaps(report)
        suggestions: list[dict[str, Any]] = []
        if gaps:
            try:
                resp = await llm.generate_suggestions(gaps)
                suggestions = [
                    {
                        "targetCode": it.target_code,
                        "targetName": it.target_name,
                        "rootCause": it.root_cause,
                        "suggestion": it.suggestion,
                        "expectedEffect": it.expected_effect,
                    }
                    for it in resp.data
                ]
                tool = make_tool_call(
                    "llm.generate_suggestions", "改进智能体", StepStatus.COMPLETED,
                    f"model={resp.model}", resp.latency,
                )
            except Exception as exc:  # noqa: BLE001
                tool = make_tool_call("llm.generate_suggestions", "改进智能体", StepStatus.FAILED, str(exc))
        else:
            tool = make_tool_call("llm.generate_suggestions", "改进智能体", StepStatus.SKIPPED, "无缺口，跳过改进")
        step = make_step(
            AgentPhase.IMPROVE, "改进智能体", "生成改进建议", StepStatus.COMPLETED,
            summary=f"生成 {len(suggestions)} 条改进建议", tool_calls=[tool],
        )
        return {
            "suggestions": suggestions,
            "phase": AgentPhase.IMPROVE.value,
            "steps": _prev_steps(state) + [step],
        }

    async def report_node(state: AgentState) -> dict[str, Any]:
        graph = state_to_graph(state.get("graph_nodes", []), state.get("graph_edges", []))
        report = analyze_coverage(graph)
        context = build_report_context(report, state.get("suggestions", []))
        chapters: list[dict[str, Any]] = []
        if context:
            try:
                resp = await llm.generate_report(context)
                chapters = [
                    {
                        "requirementCode": it.requirement_code,
                        "chapterTitle": it.chapter_title,
                        "standardRef": it.standard_ref,
                        "narrative": it.narrative,
                    }
                    for it in resp.data
                ]
                tool = make_tool_call(
                    "llm.generate_report", "报告智能体", StepStatus.COMPLETED,
                    f"model={resp.model}", resp.latency,
                )
            except Exception as exc:  # noqa: BLE001
                tool = make_tool_call("llm.generate_report", "报告智能体", StepStatus.FAILED, str(exc))
        else:
            tool = make_tool_call("llm.generate_report", "报告智能体", StepStatus.SKIPPED, "无可写章节")
        step = make_step(
            AgentPhase.REPORT, "报告智能体", "撰写自评报告章节", StepStatus.COMPLETED,
            summary=f"生成 {len(chapters)} 个报告章节", tool_calls=[tool],
        )
        return {
            "report_chapters": chapters,
            "phase": AgentPhase.REPORT.value,
            "steps": _prev_steps(state) + [step],
        }

    builder = StateGraph(AgentState)
    builder.add_node("plan", plan_node)
    builder.add_node("extract", extract_node)
    builder.add_node("infer", infer_node)
    builder.add_node("review", review_node)
    builder.add_node("coverage", coverage_node)
    builder.add_node("diagnose", diagnose_node)
    builder.add_node("improve", improve_node)
    builder.add_node("report", report_node)

    builder.add_edge(START, "plan")
    builder.add_edge("plan", "extract")
    builder.add_edge("extract", "infer")
    builder.add_edge("infer", "review")
    builder.add_edge("review", "coverage")
    builder.add_edge("coverage", "diagnose")
    builder.add_edge("diagnose", "improve")
    builder.add_edge("improve", "report")
    builder.add_edge("report", END)

    return builder.compile(checkpointer=InMemorySaver())
