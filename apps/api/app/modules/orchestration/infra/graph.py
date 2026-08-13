"""多智能体协作图（LangGraph StateGraph）。

拓扑：Supervisor 规划 → 提取智能体 → 关系推理智能体 → 人工审核网关（interrupt 人在回路）
→ 覆盖度分析智能体 → 诊断智能体 → 改进智能体 → 报告智能体。

每个节点是一个专项智能体，调用封装好的「工具」（LLM 能力 / 覆盖度纯函数 / RAG），
并把结果写回共享的 AgentState；checkpointer 提供跨阶段的状态/记忆与中断恢复能力。
"""

import hashlib
from typing import Any, TypedDict

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import interrupt

from app.modules.llm.application.ports import LLMClientPort
from app.modules.llm.application.rag_port import RAGSearchPort
from app.modules.llm.domain.models import RelationItem
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
    without_superseded_material_version,
)


class AgentState(TypedDict, total=False):
    goal: str
    material_category: str
    material_name: str
    material_text: str
    material_resource_id: str
    material_version_group_id: str
    material_version: str
    material_file_name: str
    material_course: str
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


def _relation_ref(value: Any) -> str:
    return str(value or "").strip().casefold()


def _course_code_from_name(course_name: str) -> str:
    digest = hashlib.sha1(course_name.strip().encode("utf-8")).hexdigest()[:8]
    return f"COURSE-{digest.upper()}"


def _is_authoritative_course(course_name: str) -> bool:
    normalized = course_name.strip()
    return bool(normalized) and normalized not in {"未分类", "全部课程"}


def _limit_review_relations(
    relations: list[RelationItem],
    source_nodes: list[dict[str, Any]],
) -> list[RelationItem]:
    """Keep review queues evidence-oriented and bounded per extracted source."""
    source_by_ref: dict[str, dict[str, Any]] = {}
    for node in source_nodes:
        for value in (node.get("id"), node.get("code"), node.get("name")):
            if ref := _relation_ref(value):
                source_by_ref[ref] = node

    deduplicated: dict[tuple[str, str], RelationItem] = {}
    for relation in relations:
        if relation.relation_type != "SUPPORTS" or relation.confidence < 0.70:
            continue
        key = (_relation_ref(relation.source_id), _relation_ref(relation.target_id))
        previous = deduplicated.get(key)
        if previous is None or relation.confidence > previous.confidence:
            deduplicated[key] = relation

    grouped: dict[str, list[RelationItem]] = {}
    for relation in deduplicated.values():
        grouped.setdefault(_relation_ref(relation.source_id), []).append(relation)

    limited: list[RelationItem] = []
    for source_ref, source_relations in grouped.items():
        node = source_by_ref.get(source_ref, {})
        properties = node.get("properties") or {}
        node_text = " ".join(
            str(value or "")
            for value in (
                node.get("code"),
                node.get("name"),
                node.get("description"),
                properties.get("sourceExcerpt") if isinstance(properties, dict) else "",
            )
        ).casefold()
        explicit: list[RelationItem] = []
        semantic: list[RelationItem] = []
        for relation in source_relations:
            target = _relation_ref(relation.target_id)
            aliases = {target, target.replace("-", ""), target.replace("c-", "c", 1)}
            if any(alias and alias in node_text for alias in aliases):
                explicit.append(relation)
            else:
                semantic.append(relation)

        semantic_limit = 1 if _relation_ref(node.get("kind")) == "course" else 2
        limited.extend(sorted(explicit, key=lambda item: item.confidence, reverse=True))
        limited.extend(
            sorted(semantic, key=lambda item: item.confidence, reverse=True)[:semantic_limit]
        )
    return limited


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
        material_ref = {
            "resourceId": state.get("material_resource_id") or "",
            "versionGroupId": state.get("material_version_group_id") or "",
            "version": state.get("material_version") or "",
            "name": name,
            "fileName": state.get("material_file_name") or name,
            "course": state.get("material_course") or "",
        }
        material_course = str(state.get("material_course") or "").strip()
        has_authoritative_course = _is_authoritative_course(material_course)
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
        existing_nodes = [dict(node) for node in state.get("graph_nodes", [])]
        existing_edges = [dict(edge) for edge in state.get("graph_edges", [])]
        if extracted and material_ref["versionGroupId"] and material_ref["resourceId"]:
            existing_nodes, existing_edges = without_superseded_material_version(
                existing_nodes,
                existing_edges,
                version_group_id=material_ref["versionGroupId"],
                current_resource_id=material_ref["resourceId"],
                material_names={name, material_ref["fileName"]},
            )
        existing_index = {
            str(node.get("code") or "").strip().lower(): index
            for index, node in enumerate(existing_nodes)
            if node.get("code")
        }
        seen_codes = {n.get("code") for n in existing_nodes}
        new_nodes: list[dict[str, Any]] = []
        authoritative_course_node: dict[str, Any] | None = None
        if has_authoritative_course:
            for index, node in enumerate(existing_nodes):
                if node.get("kind") != "Course":
                    continue
                props = dict(node.get("properties") or {})
                if node.get("name") == material_course or props.get("courseName") == material_course:
                    authoritative_course_node = dict(node)
                    refs = [
                        dict(ref)
                        for ref in props.get("materialRefs", [])
                        if isinstance(ref, dict)
                    ]
                    if material_ref["resourceId"] and not any(
                        ref.get("resourceId") == material_ref["resourceId"]
                        for ref in refs
                    ):
                        refs.append(material_ref)
                    props.update(
                        {
                            "courseName": material_course,
                            "materialCourse": material_course,
                            "materialName": name,
                            "materialFileName": material_ref["fileName"],
                            "materialId": material_ref["resourceId"],
                            "materialVersionGroupId": material_ref["versionGroupId"],
                            "materialVersion": material_ref["version"],
                            "materialRefs": refs,
                        }
                    )
                    authoritative_course_node["properties"] = props
                    existing_nodes[index] = authoritative_course_node
                    break

            if authoritative_course_node is None:
                course_code = _course_code_from_name(material_course)
                authoritative_course_node = {
                    "id": f"ext-{course_code.lower()}",
                    "kind": "Course",
                    "code": course_code,
                    "name": material_course,
                    "origin": "school",
                    "description": f"上传材料时选择的课程：{material_course}",
                    "properties": {
                        "extracted": False,
                        "source": "upload-course-selection",
                        "courseName": material_course,
                        "materialCourse": material_course,
                        "materialName": name,
                        "materialFileName": material_ref["fileName"],
                        "materialId": material_ref["resourceId"],
                        "materialVersionGroupId": material_ref["versionGroupId"],
                        "materialVersion": material_ref["version"],
                        "materialRefs": [material_ref],
                    },
                }
                if course_code not in seen_codes:
                    seen_codes.add(course_code)
                    new_nodes.append(authoritative_course_node)

        for item in extracted:
            if has_authoritative_course and item.get("kind") == "course":
                continue
            code = item.get("code", "")
            if not code:
                continue
            existing_position = existing_index.get(str(code).strip().lower())
            if existing_position is not None:
                existing = dict(existing_nodes[existing_position])
                if existing.get("origin") == "school" and material_ref["resourceId"]:
                    properties = dict(existing.get("properties") or {})
                    refs = [
                        dict(ref)
                        for ref in properties.get("materialRefs", [])
                        if isinstance(ref, dict)
                    ]
                    if not any(
                        ref.get("resourceId") == material_ref["resourceId"]
                        for ref in refs
                    ):
                        refs.append(material_ref)
                    properties.update(
                        {
                            "courseName": material_course if has_authoritative_course else properties.get("courseName"),
                            "materialCourse": material_course if has_authoritative_course else properties.get("materialCourse"),
                            "materialName": name,
                            "materialFileName": material_ref["fileName"],
                            "materialId": material_ref["resourceId"],
                            "materialVersionGroupId": material_ref["versionGroupId"],
                            "materialVersion": material_ref["version"],
                            "materialRefs": refs,
                        }
                    )
                    existing["properties"] = properties
                    existing_nodes[existing_position] = existing
                continue
            if code in seen_codes:
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
                        "courseName": material_course if has_authoritative_course else None,
                        "materialCourse": material_course if has_authoritative_course else None,
                        "materialName": name,
                        "materialFileName": material_ref["fileName"],
                        "materialId": material_ref["resourceId"],
                        "materialVersionGroupId": material_ref["versionGroupId"],
                        "materialVersion": material_ref["version"],
                        "materialRefs": [material_ref],
                    },
                }
            )

        all_nodes = existing_nodes + new_nodes
        node_by_code = {
            str(n.get("code") or "").lower(): n
            for n in all_nodes
            if n.get("code")
        }
        extracted_courses = [
            node_by_code.get(str(item.get("code") or "").lower())
            for item in extracted
            if item.get("kind") == "course"
        ]
        extracted_courses = [n for n in extracted_courses if n is not None]
        if authoritative_course_node is not None:
            extracted_courses = [authoritative_course_node]
        extracted_experiments = [
            node_by_code.get(str(item.get("code") or "").lower())
            for item in extracted
            if item.get("kind") == "experiment"
        ]
        extracted_experiments = [n for n in extracted_experiments if n is not None]

        seen_edge_ids = {e.get("id") for e in existing_edges}
        structural_edges: list[dict[str, Any]] = []
        if extracted_courses:
            course_node = extracted_courses[0]
            course_id = str(course_node.get("id") or "")
            for experiment_node in extracted_experiments:
                experiment_id = str(experiment_node.get("id") or "")
                if not course_id or not experiment_id:
                    continue
                edge_id = f"edge-belongs-{experiment_id}-{course_id}"
                if edge_id in seen_edge_ids:
                    for index, edge in enumerate(existing_edges):
                        if edge.get("id") != edge_id or not material_ref["resourceId"]:
                            continue
                        refs = [
                            dict(ref)
                            for ref in edge.get("materialRefs", [])
                            if isinstance(ref, dict)
                        ]
                        if not any(
                            ref.get("resourceId") == material_ref["resourceId"]
                            for ref in refs
                        ):
                            refs.append(material_ref)
                        existing_edges[index] = {**edge, "materialRefs": refs}
                    continue
                seen_edge_ids.add(edge_id)
                structural_edges.append(
                    {
                        "id": edge_id,
                        "source": experiment_id,
                        "target": course_id,
                        "kind": "BELONGS_TO",
                        "sourceType": "rule",
                        "reviewStatus": "approved",
                        "reasoning": "同一材料中识别出的实验项目自动归属于该课程，仅用于图谱层级展示，不参与达成度计算。",
                        "materialResourceId": material_ref["resourceId"],
                        "materialVersionGroupId": material_ref["versionGroupId"],
                        "materialVersion": material_ref["version"],
                        "materialName": name,
                        "materialRefs": [material_ref],
                    }
                )

        step = make_step(
            AgentPhase.EXTRACT, "提取智能体", "解析教学材料，提取节点", StepStatus.COMPLETED,
            summary=(
                f"提取 {len(extracted)} 个候选节点，新增入图 {len(new_nodes)} 个，"
                f"补充结构关系 {len(structural_edges)} 条"
            ),
            tool_calls=[tool],
        )
        return {
            "extracted": extracted,
            "graph_nodes": all_nodes,
            "graph_edges": existing_edges + structural_edges,
            "phase": AgentPhase.EXTRACT.value,
            "steps": _prev_steps(state) + [step],
        }

    async def infer_node(state: AgentState) -> dict[str, Any]:
        nodes_d = state.get("graph_nodes", [])
        extracted_refs = {
            str(value or "").strip().lower()
            for item in state.get("extracted", [])
            for value in (item.get("code"), item.get("name"))
            if str(value or "").strip()
        }
        all_school_nodes = school_node_dicts(nodes_d)
        current_school_nodes = [
            node
            for node in all_school_nodes
            if str(node.get("code") or "").strip().lower() in extracted_refs
            or str(node.get("name") or "").strip().lower() in extracted_refs
        ]
        # 只对本次材料提取出的学校节点做关系推理，避免每次上传都把整张图谱
        # 重新推断一遍，造成同一实验项目反复进入审核队列。
        relation_sources = current_school_nodes
        try:
            resp = await llm.infer_relations(relation_sources, standard_node_dicts(nodes_d))
            allowed_source_refs = {
                str(value or "").strip().casefold()
                for node in relation_sources
                for value in (node.get("id"), node.get("code"), node.get("name"))
                if str(value or "").strip()
            }
            allowed_target_refs = {
                str(value or "").strip().casefold()
                for node in standard_node_dicts(nodes_d)
                for value in (node.get("id"), node.get("code"), node.get("name"))
                if str(value or "").strip()
            }
            filtered_relations = [
                relation
                for relation in resp.data
                if str(relation.source_id or "").strip().casefold() in allowed_source_refs
                and str(relation.target_id or "").strip().casefold() in allowed_target_refs
            ]
            # 当材料提取出实验项目时，课程节点只承担归属展示；支撑证据必须落到
            # 具体实验，避免模型额外生成课程级泛化关系而虚高 M5 覆盖率。
            experiment_refs = {
                str(value or "").strip().casefold()
                for node in relation_sources
                if str(node.get("kind") or "").casefold() == "experiment"
                for value in (node.get("id"), node.get("code"), node.get("name"))
                if str(value or "").strip()
            }
            if experiment_refs:
                filtered_relations = [
                    relation
                    for relation in filtered_relations
                    if str(relation.source_id or "").strip().casefold() in experiment_refs
                ]
            filtered_relations = _limit_review_relations(
                filtered_relations, relation_sources
            )
            pending = relations_to_pending_edges(filtered_relations, nodes_d)
            for edge in pending:
                edge.update(
                    {
                        "materialResourceId": state.get("material_resource_id") or "",
                        "materialVersionGroupId": state.get("material_version_group_id") or "",
                        "materialVersion": state.get("material_version") or "",
                        "materialName": state.get("material_name") or "",
                    }
                )
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
        if not relations:
            step = make_step(
                AgentPhase.REVIEW,
                "人工审核网关",
                "教师审核 AI 推断的关系",
                StepStatus.SKIPPED,
                summary="没有生成可审核关系，跳过人工审核网关",
                tool_calls=[
                    make_tool_call(
                        "human.review",
                        "人工审核网关",
                        StepStatus.SKIPPED,
                        "0 pending relations",
                        0,
                    )
                ],
            )
            return {
                "review_decisions": [],
                "phase": AgentPhase.REVIEW.value,
                "steps": _prev_steps(state) + [step],
            }
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
