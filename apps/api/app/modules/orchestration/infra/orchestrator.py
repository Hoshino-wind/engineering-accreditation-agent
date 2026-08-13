"""LangGraph 多智能体编排器（AgentOrchestratorPort 的具体实现）。

负责：启动运行（执行到人工审核网关处暂停）、按 ID 查询、列出运行、提交审核决策并恢复运行、
以及事件流。运行的真实状态保存在 LangGraph checkpointer（以 thread_id = run_id 索引），
本类另外维护一份 AgentRun 快照索引以便快速查询与列表。
"""

import logging
import uuid
from collections.abc import AsyncIterator
from typing import Any

from langgraph.types import Command

from app.modules.courses.domain.course import Course
from app.modules.llm.application.ports import LLMClientPort
from app.modules.llm.application.rag_port import RAGSearchPort
from app.modules.orchestration.application.ports import AgentOrchestratorPort
from app.modules.orchestration.domain.models import (
    AgentPhase,
    AgentRun,
    AgentStep,
    RunStatus,
    StepStatus,
    ToolCallRecord,
)
from app.modules.orchestration.infra.graph import build_agent_graph
from app.modules.orchestration.infra.tools import now_iso

logger = logging.getLogger(__name__)


def _interrupt_value(snapshot: Any) -> dict[str, Any] | None:
    """从图状态快照中提取 interrupt() 携带的载荷。"""
    for task in getattr(snapshot, "tasks", []) or []:
        for intr in getattr(task, "interrupts", []) or []:
            value = getattr(intr, "value", None)
            if isinstance(value, dict):
                return value
    return None


def _build_tool_call(data: dict[str, Any]) -> ToolCallRecord:
    return ToolCallRecord(
        tool=data.get("tool", ""),
        agent=data.get("agent", ""),
        status=StepStatus(data.get("status", "completed")),
        summary=data.get("summary", ""),
        latency_ms=int(data.get("latencyMs", 0) or 0),
        detail=dict(data.get("detail") or {}),
    )


def _build_step(data: dict[str, Any]) -> AgentStep:
    return AgentStep(
        phase=AgentPhase(data.get("phase", "plan")),
        agent=data.get("agent", ""),
        title=data.get("title", ""),
        status=StepStatus(data.get("status", "pending")),
        summary=data.get("summary", ""),
        started_at=data.get("startedAt"),
        finished_at=data.get("finishedAt"),
        tool_calls=[_build_tool_call(t) for t in data.get("toolCalls", [])],
    )


def _build_result(values: dict[str, Any]) -> dict[str, Any]:
    return {
        "coverage": values.get("coverage", {}),
        "explanations": values.get("explanations", []),
        "suggestions": values.get("suggestions", []),
        "reportChapters": values.get("report_chapters", []),
        "extracted": values.get("extracted", []),
        "relations": values.get("relations", []),
    }


class LangGraphAgentOrchestrator(AgentOrchestratorPort):
    def __init__(self, llm: LLMClientPort, rag: RAGSearchPort | None = None, user_id: str | None = None) -> None:
        self._graph = build_agent_graph(llm, rag)
        self._runs: dict[str, AgentRun] = {}
        # 与 LangGraph 内存 checkpointer 并行的 JSON 持久化图谱，保证重启不丢
        from app.modules.orchestration.infra.graph_state_store import JsonGraphStateStore

        self._graph_store = JsonGraphStateStore(user_id=user_id or "template")

    def _config(self, run_id: str) -> dict[str, Any]:
        return {"configurable": {"thread_id": run_id}}

    def _materialize(
        self,
        run_id: str,
        goal: str,
        values: dict[str, Any],
        status: RunStatus,
        pending_review: list[dict[str, Any]],
        created_at: str,
    ) -> AgentRun:
        return AgentRun(
            run_id=run_id,
            goal=goal,
            status=status,
            plan=list(values.get("plan", [])),
            steps=[_build_step(s) for s in values.get("steps", [])],
            pending_review=pending_review,
            result=_build_result(values),
            created_at=created_at,
            updated_at=now_iso(),
        )

    async def start_run(
        self,
        goal: str,
        material_category: str | None = None,
        material_name: str | None = None,
        material_text: str | None = None,
        material_resource_id: str | None = None,
        material_version_group_id: str | None = None,
        material_version: str | None = None,
        material_file_name: str | None = None,
        material_course: str | None = None,
    ) -> AgentRun:
        run_id = f"run-{uuid.uuid4().hex[:12]}"
        created_at = now_iso()
        initial: dict[str, Any] = {
            "goal": goal,
            "material_category": material_category or "",
            "material_name": material_name or "",
            "material_text": material_text or "",
            "material_resource_id": material_resource_id or "",
            "material_version_group_id": material_version_group_id or "",
            "material_version": material_version or "",
            "material_file_name": material_file_name or material_name or "",
            "material_course": material_course or "",
        }
        # 单一真源：从持久化图谱读取当前状态作为运行起点（空则 plan_node 回退种子图），
        # 使多次上传在同一张能力图谱上持续生长，而不是每次都从种子重新开始。
        persisted = self._graph_store.load()
        if persisted is not None and persisted.get("nodes"):
            initial["graph_nodes"] = list(persisted["nodes"])
            initial["graph_edges"] = list(persisted["edges"])
        config = self._config(run_id)
        try:
            await self._graph.ainvoke(initial, config)
        except Exception as exc:  # noqa: BLE001
            logger.exception("智能体运行启动失败")
            run = AgentRun(
                run_id=run_id,
                goal=goal,
                status=RunStatus.FAILED,
                created_at=created_at,
                updated_at=now_iso(),
                error=str(exc),
            )
            self._runs[run_id] = run
            return run

        snapshot = self._graph.get_state(config)
        values = dict(snapshot.values or {})
        interrupt_payload = _interrupt_value(snapshot)
        if interrupt_payload is not None:
            status = RunStatus.AWAITING_REVIEW
            pending_review = list(interrupt_payload.get("pending_review", []))
        else:
            status = RunStatus.COMPLETED
            pending_review = []

        run = self._materialize(run_id, goal, values, status, pending_review, created_at)
        self._runs[run_id] = run
        # 同步持久化：把本运行生长出的图谱节点/边额外保存到 JSON，重启不丢失
        try:
            nodes = values.get("graph_nodes", [])
            edges = values.get("graph_edges", [])
            # Material runs become authoritative only after they produce at
            # least one reviewable relationship. Otherwise extracted nodes are
            # merely a partial result and must not leak into the formal graph.
            should_persist = bool(nodes) and (
                not material_resource_id or bool(values.get("relations"))
            )
            if should_persist:
                self._graph_store.save(nodes, edges)
        except Exception:  # noqa: BLE001
            logger.exception("同步写入图谱持久化失败，忽略不影响运行主流程")
        return run

    async def get_run(self, run_id: str) -> AgentRun | None:
        return self._runs.get(run_id)

    async def list_runs(self) -> list[AgentRun]:
        return sorted(
            self._runs.values(),
            key=lambda r: r.created_at or "",
            reverse=True,
        )

    async def resume_review(
        self,
        run_id: str,
        decisions: list[dict[str, Any]],
    ) -> AgentRun | None:
        existing = self._runs.get(run_id)
        if existing is None:
            return None
        config = self._config(run_id)
        try:
            await self._graph.ainvoke(Command(resume=decisions), config)
        except Exception as exc:  # noqa: BLE001
            logger.exception("智能体运行恢复失败")
            existing.status = RunStatus.FAILED
            existing.error = str(exc)
            existing.updated_at = now_iso()
            return existing

        snapshot = self._graph.get_state(config)
        values = dict(snapshot.values or {})
        interrupt_payload = _interrupt_value(snapshot)
        if interrupt_payload is not None:
            status = RunStatus.AWAITING_REVIEW
            pending_review = list(interrupt_payload.get("pending_review", []))
        else:
            status = RunStatus.COMPLETED
            pending_review = []

        run = self._materialize(
            run_id,
            existing.goal,
            values,
            status,
            pending_review,
            existing.created_at or now_iso(),
        )
        self._runs[run_id] = run
        # 审核完成、后续阶段结束后，也把最终图谱同步到 JSON 持久化
        try:
            nodes = values.get("graph_nodes", [])
            edges = values.get("graph_edges", [])
            if nodes:
                self._graph_store.save(nodes, edges)
        except Exception:  # noqa: BLE001
            logger.exception("同步写入图谱持久化失败，忽略不影响运行主流程")
        return run

    async def stream_events(self, run_id: str) -> AsyncIterator[dict[str, Any]]:
        """产出当前运行快照事件（前端以轮询 get_run 为主，SSE 作为可选增强）。"""
        run = self._runs.get(run_id)
        if run is None:
            yield {"event": "error", "runId": run_id, "data": {"message": "run not found"}}
            return
        yield {"event": "snapshot", "runId": run_id, "data": run.to_dict()}

    async def get_current_graph(self) -> dict[str, Any]:
        """返回当前能力图谱（单一真源）。

        读取优先级：
        1. JSON 持久化图谱（graph_state_{user}.json）—— 唯一权威存储；
        2. 二者皆空 → 种子图（标准毕业要求 + 能力指标），不读取运行内存。
        """
        from app.modules.orchestration.infra.seed_graph import build_seed_graph
        from app.modules.orchestration.infra.tools import graph_to_state

        persisted = self._graph_store.load()
        if persisted is not None and persisted.get("nodes"):
            return persisted

        seed = build_seed_graph()
        nodes_d, edges_d = graph_to_state(seed)
        return {"nodes": nodes_d, "edges": edges_d}

    async def get_current_coverage(self) -> dict[str, Any]:
        """对当前图谱执行覆盖度分析。"""
        from app.modules.orchestration.domain.coverage import analyze_coverage
        from app.modules.orchestration.infra.tools import state_to_graph

        graph_data = await self.get_current_graph()
        graph = state_to_graph(graph_data["nodes"], graph_data["edges"])
        report = analyze_coverage(graph)
        return report.to_dict()

    async def review_project_candidates(
        self, candidates: list[Any]
    ) -> dict[str, list[dict[str, Any]]]:
        """把识别中心审核决策投影进权威图谱（已采纳/驳回的关系候选）。

        「图谱是审核决策的投影」：教师在识别中心的采纳/驳回会真实改变
        能力图谱的边与覆盖度；不受裁决影响的候选保持原样。
        投影结果落回 JSON 权威存储，重启后依然生效。
        """
        from app.modules.orchestration.domain.projection import apply_review_decisions

        persisted = self._graph_store.load()
        if persisted and persisted.get("nodes"):
            nodes = list(persisted["nodes"])
            edges = list(persisted["edges"])
        else:
            from app.modules.orchestration.infra.seed_graph import build_seed_graph
            from app.modules.orchestration.infra.tools import graph_to_state

            seed = build_seed_graph()
            nodes, edges = graph_to_state(seed)
        merged = apply_review_decisions(nodes, edges, candidates)
        self._graph_store.save(merged["nodes"], merged["edges"])
        return merged

    async def remove_material(
        self,
        material_names: set[str],
        resource_ids: set[str] | None = None,
    ) -> set[str]:
        """从能力图谱中撤销指定材料派生出的学校节点与关联边。"""
        try:
            ctx = self._graph_store.remove_material(
                material_names=material_names,
                resource_ids=resource_ids or set(),
            )
            return ctx.removed_node_ids
        except Exception:  # noqa: BLE001
            logger.exception("清理持久化图谱材料节点失败")
            return set()

    async def retain_materials(self, valid_resource_ids: set[str]) -> set[str]:
        """按材料仓储中的有效 ID 收敛当前专业图谱。"""
        try:
            ctx = self._graph_store.retain_materials(valid_resource_ids)
            return ctx.removed_node_ids
        except Exception:  # noqa: BLE001
            logger.exception("按有效材料收敛持久化图谱失败")
            return set()

    async def clear_school_graph(self, course_name: str | None = None) -> set[str]:
        """清空当前专业/课程范围内由学校材料生成的图谱节点。"""
        try:
            ctx = self._graph_store.clear_school_nodes(course_name)
            return ctx.removed_node_ids
        except Exception:  # noqa: BLE001
            logger.exception("清空持久化图谱学校节点失败")
            return set()

    async def remove_course(self, course: Course) -> set[str]:
        """从能力图谱中移除指定课程及其下游子节点，返回被移除节点的 id 集合。

        清理顺序（保证重启后数据也是干净的）：
        1. 先在 JSON 持久化图谱（graph_state_{user}.json）上执行清理——这是真源；
        2. 再在当前进程每个 LangGraph 运行的内存 state 上执行相同清理。

        匹配策略（任一命中即视为该课程的图谱节点）：
        - graph_node_id 精确匹配（课程创建时已显式绑定）
        - code 精确匹配（忽略大小写）
        - name 精确匹配
        - name 包含匹配（兼容「电子电路2」「电子电路X」等 AI 命名变体）

        额外清理：找到 Course 节点集合后，同时把这些 Course 下游的
        Experiment / KnowledgePoint / TeachingResource 子节点一并移除，
        以及所有端点落在移除集合中的边。
        """
        removed_ids: set[str] = set()

        # 1. 优先清理 JSON 持久化图谱（保证重启后数据也是干净的）
        try:
            ctx = self._graph_store.remove_course(course)
            removed_ids.update(ctx.removed_node_ids)
        except Exception:  # noqa: BLE001
            logger.exception("清理持久化图谱课程节点失败")

        # 2. 再清理 LangGraph 内存中所有运行的 state
        if self._runs:
            course_code = (course.code or "").strip().lower()
            course_name = (course.name or "").strip()
            course_name_norm = course_name.lower()
            graph_node_id = course.graph_node_id

            for run in self._runs.values():
                config = self._config(run.run_id)
                try:
                    snapshot = self._graph.get_state(config)
                    values = dict(snapshot.values or {})
                    nodes: list[dict[str, Any]] = values.get("graph_nodes", [])
                    edges: list[dict[str, Any]] = values.get("graph_edges", [])
                    if not nodes:
                        continue

                    course_node_ids: set[str] = set()
                    for node in nodes:
                        if node.get("kind") != "Course":
                            continue
                        if graph_node_id and node.get("id") == graph_node_id:
                            course_node_ids.add(node["id"])
                            continue
                        if course_code and (node.get("code") or "").strip().lower() == course_code:
                            course_node_ids.add(node["id"])
                            continue
                        if course_name:
                            name = (node.get("name") or "").strip()
                            if name == course_name:
                                course_node_ids.add(node["id"])
                                continue
                            if name and course_name_norm and course_name_norm in name.lower():
                                course_node_ids.add(node["id"])
                                continue

                    if not course_node_ids:
                        continue

                    to_remove: set[str] = set(course_node_ids)
                    for edge in edges:
                        if edge.get("source") in course_node_ids:
                            target_kind = next(
                                (n.get("kind") for n in nodes if n.get("id") == edge.get("target")),
                                None,
                            )
                            if target_kind in (
                                "Experiment",
                                "KnowledgePoint",
                                "TeachingResource",
                            ):
                                to_remove.add(str(edge["target"]))

                    removed_ids.update(to_remove)
                    new_nodes = [n for n in nodes if n.get("id") not in to_remove]
                    new_edges = [
                        e
                        for e in edges
                        if e.get("source") not in to_remove and e.get("target") not in to_remove
                    ]
                    self._graph.update_state(config, {"graph_nodes": new_nodes, "graph_edges": new_edges})
                except Exception:  # noqa: BLE001
                    continue

        return removed_ids
