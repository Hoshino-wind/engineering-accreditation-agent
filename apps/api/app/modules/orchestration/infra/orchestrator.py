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
    def __init__(self, llm: LLMClientPort, rag: RAGSearchPort | None = None) -> None:
        self._graph = build_agent_graph(llm, rag)
        self._runs: dict[str, AgentRun] = {}

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
    ) -> AgentRun:
        run_id = f"run-{uuid.uuid4().hex[:12]}"
        created_at = now_iso()
        initial: dict[str, Any] = {
            "goal": goal,
            "material_category": material_category or "",
            "material_name": material_name or "",
        }
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
        return run

    async def stream_events(self, run_id: str) -> AsyncIterator[dict[str, Any]]:
        """产出当前运行快照事件（前端以轮询 get_run 为主，SSE 作为可选增强）。"""
        run = self._runs.get(run_id)
        if run is None:
            yield {"event": "error", "runId": run_id, "data": {"message": "run not found"}}
            return
        yield {"event": "snapshot", "runId": run_id, "data": run.to_dict()}
