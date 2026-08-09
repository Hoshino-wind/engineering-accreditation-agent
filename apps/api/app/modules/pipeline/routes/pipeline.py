from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends

from app.modules.pipeline.application import GetPipelineStatus
from app.modules.pipeline.contracts import PipelineStatusResponse


def create_pipeline_router(
    get_pipeline_status_use_case: Callable[[], GetPipelineStatus],
    get_current_user: Callable | None = None,
) -> APIRouter:
    router = APIRouter(prefix="/pipeline", tags=["pipeline"])

    # 可选鉴权
    auth_deps: list = []
    if get_current_user is not None:
        auth_deps.append(Depends(get_current_user))

    @router.get(
        "/status",
        response_model=PipelineStatusResponse,
        summary="获取 Pipeline 全局进度",
        dependencies=auth_deps,
    )
    async def get_pipeline_status(
        use_case: Annotated[GetPipelineStatus, Depends(get_pipeline_status_use_case)],
    ) -> PipelineStatusResponse:
        result = await use_case.execute()
        return PipelineStatusResponse(
            stage=result.stage,
            progress=result.progress,
            message=result.message,
            pendingReviewCount=result.pending_review_count,
            pendingRunReviewCount=result.pending_run_review_count,
            gapCount=result.gap_count,
            suggestionCount=result.suggestion_count,
            lastUpdated=result.last_updated,
        )

    return router
