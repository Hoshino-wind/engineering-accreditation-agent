from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.modules.evaluations.application import (
    CreateEvaluationRun,
    CreateScoreImportBatch,
    GetEvaluationPreflight,
    GetEvaluationRun,
    GetEvaluationRunReference,
    GetScoreImportBatch,
    ListEvaluationObjects,
)
from app.modules.evaluations.contracts import (
    EvaluationObjectListResponse,
    EvaluationObjectSummaryResponse,
    EvaluationRunDetailResponse,
    EvaluationRunReferenceNotFoundResponse,
    EvaluationRunReferenceResponse,
)
from app.modules.evaluations.routes.evaluation_preflight import (
    create_evaluation_preflight_router,
)
from app.modules.evaluations.routes.evaluation_route_params import (
    EvaluationRunIdPath,
)
from app.modules.evaluations.routes.evaluation_run_creation import (
    create_evaluation_run_router,
)
from app.modules.evaluations.routes.score_import_batches import (
    create_score_import_batches_router,
)


def create_evaluations_router(
    provide_list_objects: Callable[[], ListEvaluationObjects],
    provide_get_run: Callable[[], GetEvaluationRun],
    provide_get_reference: Callable[[], GetEvaluationRunReference],
    provide_get_preflight: Callable[[], GetEvaluationPreflight],
    provide_create_run: Callable[[], CreateEvaluationRun],
    provide_create_score_batch: Callable[[], CreateScoreImportBatch] | None = None,
    provide_get_score_batch: Callable[[], GetScoreImportBatch] | None = None,
) -> APIRouter:
    if (provide_create_score_batch is None) != (provide_get_score_batch is None):
        raise ValueError("评分批次创建与查询 provider 必须成对提供")
    router = APIRouter(
        prefix="/evaluations",
        tags=["evaluations"],
    )

    @router.get(
        "/objects",
        response_model=EvaluationObjectListResponse,
        summary="列出评价对象及其展示运行摘要",
    )
    async def list_evaluation_objects(
        use_case: Annotated[
            ListEvaluationObjects,
            Depends(provide_list_objects),
        ],
    ) -> EvaluationObjectListResponse:
        evaluated = await use_case.run()
        items = [
            EvaluationObjectSummaryResponse.from_evaluated(item)
            for item in evaluated
        ]
        return EvaluationObjectListResponse(
            items=items,
            total=len(items),
        )

    @router.get(
        "/runs/{run_id}/reference",
        response_model=EvaluationRunReferenceResponse,
        responses={
            404: {
                "description": "评价运行不存在",
                "model": EvaluationRunReferenceNotFoundResponse,
            }
        },
        summary="读取评价运行的权威对象引用",
    )
    async def get_evaluation_run_reference(
        run_id: EvaluationRunIdPath,
        use_case: Annotated[
            GetEvaluationRunReference,
            Depends(provide_get_reference),
        ],
    ) -> EvaluationRunReferenceResponse:
        reference = await use_case.run(run_id)
        if reference is None:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "evaluation_run_not_found",
                    "message": "未找到指定评价运行",
                    "runId": run_id,
                },
            )
        return EvaluationRunReferenceResponse.from_reference(reference)

    @router.get(
        "/runs/{run_id}",
        response_model=EvaluationRunDetailResponse,
        responses={
            404: {
                "description": "评价运行不存在",
                "model": EvaluationRunReferenceNotFoundResponse,
            }
        },
        summary="读取评价运行及其确定性计算明细",
    )
    async def get_evaluation_run(
        run_id: EvaluationRunIdPath,
        use_case: Annotated[
            GetEvaluationRun,
            Depends(provide_get_run),
        ],
    ) -> EvaluationRunDetailResponse:
        evaluated = await use_case.run(run_id)
        if evaluated is None:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "evaluation_run_not_found",
                    "message": "未找到指定评价运行",
                    "runId": run_id,
                },
            )
        return EvaluationRunDetailResponse.from_evaluated(evaluated)

    router.include_router(
        create_evaluation_preflight_router(provide_get_preflight)
    )
    router.include_router(create_evaluation_run_router(provide_create_run))
    if provide_create_score_batch is not None and provide_get_score_batch is not None:
        router.include_router(
            create_score_import_batches_router(
                provide_create_score_batch,
                provide_get_score_batch,
            )
        )
    return router
