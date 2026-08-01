# -*- coding: utf-8 -*-
"""Autopilot 路由：一键触发材料→图谱→诊断→建议全链路。"""
from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends

from app.modules.autopilot.contracts import (
    AutopilotRunRequest,
    AutopilotRunResponse,
    AutopilotStepResult,
    AutopilotNodeItem,
    AutopilotRelationItem,
    AutopilotFindingItem,
    AutopilotSuggestionItem,
)
from app.modules.autopilot.orchestrator import AutopilotOrchestrator


def create_autopilot_router(
    orchestrator_provider: Callable[[], AutopilotOrchestrator],
) -> APIRouter:
    router = APIRouter(prefix="/autopilot", tags=["autopilot"])

    @router.post(
        "/run",
        response_model=AutopilotRunResponse,
        summary="一键编排：材料 → 节点提取 → 关系推断 → 诊断 → 建议",
    )
    async def run_autopilot(
        body: AutopilotRunRequest,
        orchestrator: Annotated[AutopilotOrchestrator, Depends(orchestrator_provider)],
    ) -> AutopilotRunResponse:
        result = await orchestrator.run(
            resource_id=body.resource_id,
            course=body.course,
        )
        return AutopilotRunResponse(
            resource_id=result["resource_id"],
            resource_name=result["resource_name"],
            course=result["course"],
            model=result["model"],
            started_at=result["started_at"],
            finished_at=result["finished_at"],
            total_latency_ms=result["total_latency_ms"],
            steps=[AutopilotStepResult(**s) for s in result["steps"]],
            nodes=[AutopilotNodeItem(**n) for n in result["nodes"]],
            relations=[AutopilotRelationItem(**r) for r in result["relations"]],
            findings=[AutopilotFindingItem(**f) for f in result["findings"]],
            suggestions=[AutopilotSuggestionItem(**s) for s in result["suggestions"]],
            candidates_created=result["candidates_created"],
            findings_created=result["findings_created"],
        )

    return router
