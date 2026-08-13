"""编排模块 HTTP 路由。

仅依赖 application 端口 + contracts，不引入 domain / infra / app.core。
路由工厂接受 Callable provider（在 main.py 装配时闭包注入具体实现）。
"""

from collections.abc import Callable
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.modules.orchestration.application.graph_query import QueryProjectedGraph
from app.modules.orchestration.application.ports import AgentOrchestratorPort
from app.modules.orchestration.contracts.run import (
    ReviewRequest,
    RunResponse,
    StartRunRequest,
)


def _run_to_response(run: Any) -> RunResponse:
    """将 AgentRun 域对象转为 HTTP 响应（通过 to_dict 桥接，避免路由层直接引用 domain）。"""
    d = run.to_dict()
    return RunResponse(**d)


def create_orchestration_router(
    provide_orchestrator: Callable[[], AgentOrchestratorPort],
    get_current_user: Callable[..., Any] | None = None,
    provide_graph_query: Callable[[], QueryProjectedGraph] | None = None,
) -> APIRouter:
    router = APIRouter(prefix="/orchestration", tags=["orchestration"])

    # 可选鉴权：若传入 get_current_user 则所有端点需 Bearer token
    auth_deps: list[Any] = []
    if get_current_user is not None:
        auth_deps = [Depends(get_current_user)]

    @router.post(
        "/runs",
        response_model=RunResponse,
        summary="启动多智能体协作运行",
        dependencies=auth_deps,
    )
    async def start_run(
        body: StartRunRequest,
        orchestrator: Annotated[AgentOrchestratorPort, Depends(provide_orchestrator)],
    ) -> RunResponse:
        run = await orchestrator.start_run(
            goal=body.goal,
            material_category=body.materialCategory,
            material_name=body.materialName,
            material_course=body.materialCourse,
        )
        return _run_to_response(run)

    @router.get(
        "/runs",
        response_model=list[RunResponse],
        summary="列出所有运行",
        dependencies=auth_deps,
    )
    async def list_runs(
        orchestrator: Annotated[AgentOrchestratorPort, Depends(provide_orchestrator)],
    ) -> list[RunResponse]:
        runs = await orchestrator.list_runs()
        return [_run_to_response(r) for r in runs]

    @router.get(
        "/runs/{run_id}",
        response_model=RunResponse,
        summary="获取运行状态",
        dependencies=auth_deps,
    )
    async def get_run(
        run_id: str,
        orchestrator: Annotated[AgentOrchestratorPort, Depends(provide_orchestrator)],
    ) -> RunResponse:
        run = await orchestrator.get_run(run_id)
        if run is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Run {run_id} not found",
            )
        return _run_to_response(run)

    @router.get(
        "/runs/{run_id}/events",
        summary="SSE 事件流",
        dependencies=auth_deps,
    )
    async def stream_events(
        run_id: str,
        orchestrator: Annotated[AgentOrchestratorPort, Depends(provide_orchestrator)],
    ) -> StreamingResponse:
        run = await orchestrator.get_run(run_id)
        if run is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Run {run_id} not found",
            )

        import json

        async def event_generator():
            async for event in orchestrator.stream_events(run_id):
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    @router.post(
        "/runs/{run_id}/review",
        response_model=RunResponse,
        summary="提交审核决策并恢复运行",
        dependencies=auth_deps,
    )
    async def submit_review(
        run_id: str,
        body: ReviewRequest,
        orchestrator: Annotated[AgentOrchestratorPort, Depends(provide_orchestrator)],
    ) -> RunResponse:
        decisions = [
            {
                "relation_id": d.relationId,
                "decision": d.decision,
                "strength": d.strength,
            }
            for d in body.decisions
        ]
        run = await orchestrator.resume_review(run_id, decisions)
        if run is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Run {run_id} not found or not awaiting review",
            )
        return _run_to_response(run)

    @router.get(
        "/graph",
        summary="获取当前能力图谱（nodes + edges，含识别中心审核决策投影）",
        dependencies=auth_deps,
    )
    async def get_graph(
        orchestrator: Annotated[AgentOrchestratorPort, Depends(provide_orchestrator)],
        graph_query: Annotated[
            QueryProjectedGraph | None, Depends(provide_graph_query)
        ] = None,
    ) -> dict[str, Any]:
        if graph_query is not None:
            return await graph_query.current_graph()
        return await orchestrator.get_current_graph()

    @router.get(
        "/coverage",
        summary="获取当前图谱覆盖度分析（兼容别名，等价 /graph/coverage）",
        dependencies=auth_deps,
        include_in_schema=False,
    )
    async def get_graph_coverage_alias(
        orchestrator: Annotated[AgentOrchestratorPort, Depends(provide_orchestrator)],
        graph_query: Annotated[
            QueryProjectedGraph | None, Depends(provide_graph_query)
        ] = None,
    ) -> dict[str, Any]:
        return await get_graph_coverage(orchestrator, graph_query)

    @router.get(
        "/graph/coverage",
        summary="获取当前图谱覆盖度分析（含识别中心审核决策投影）",
        dependencies=auth_deps,
    )
    async def get_graph_coverage(
        orchestrator: Annotated[AgentOrchestratorPort, Depends(provide_orchestrator)],
        graph_query: Annotated[
            QueryProjectedGraph | None, Depends(provide_graph_query)
        ] = None,
    ) -> dict[str, Any]:
        if graph_query is not None:
            return await graph_query.current_coverage()
        return await orchestrator.get_current_coverage()

    return router
