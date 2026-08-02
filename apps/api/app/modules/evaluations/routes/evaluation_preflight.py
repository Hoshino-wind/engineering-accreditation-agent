from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.modules.evaluations.application import GetEvaluationPreflight
from app.modules.evaluations.contracts import (
    EvaluationPreflightResponse,
    EvaluationRunReferenceNotFoundResponse,
)
from app.modules.evaluations.routes.evaluation_route_params import (
    EvaluationRunIdPath,
)


def create_evaluation_preflight_router(
    provide_get_preflight: Callable[[], GetEvaluationPreflight],
) -> APIRouter:
    router = APIRouter()

    @router.get(
        "/runs/{run_id}/preflight",
        response_model=EvaluationPreflightResponse,
        responses={
            404: {
                "description": "评价运行不存在",
                "model": EvaluationRunReferenceNotFoundResponse,
            }
        },
        summary="读取精确评价运行的结构化输入预检报告",
    )
    async def get_evaluation_preflight(
        run_id: EvaluationRunIdPath,
        use_case: Annotated[
            GetEvaluationPreflight,
            Depends(provide_get_preflight),
        ],
    ) -> EvaluationPreflightResponse:
        report = await use_case.run(run_id)
        if report is None:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "evaluation_run_not_found",
                    "message": "未找到指定评价运行",
                    "runId": run_id,
                },
            )
        return EvaluationPreflightResponse.from_report(report)

    return router


__all__ = ["create_evaluation_preflight_router"]
