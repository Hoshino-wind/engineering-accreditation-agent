from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.modules.evaluations.application import (
    CreateScoreImportBatch,
    CreateScoreImportBatchCommand,
    GetScoreImportBatch,
    PerStudentScoreCommandPayload,
    PilotScoreBatchCaptureDisabledError,
)
from app.modules.evaluations.contracts import (
    CreateScoreImportBatchRequest,
    CreateScoreImportBatchResponse,
    ScoreImportBatchResponse,
    ScoreImportErrorResponse,
)
from app.modules.evaluations.routes.evaluation_route_params import (
    IdempotencyKeyHeader,
    ScoreImportBatchIdPath,
)
from app.modules.evaluations.routes.score_import_http_errors import (
    SCORE_IMPORT_CREATION_ERRORS,
    score_import_creation_error,
    score_import_disabled_error,
)


def create_score_import_batches_router(
    provide_create: Callable[[], CreateScoreImportBatch],
    provide_get: Callable[[], GetScoreImportBatch],
) -> APIRouter:
    router = APIRouter()

    @router.post(
        "/score-import-batches",
        name="create_score_import_batch",
        response_model=CreateScoreImportBatchResponse,
        status_code=status.HTTP_201_CREATED,
        responses={
            201: {
                "description": "试点汇总评分批次已创建或按幂等键恢复",
                "headers": {
                    "Location": {
                        "description": "评分批次的权威详情地址",
                        "schema": {"type": "string", "format": "uri"},
                    }
                },
            },
            404: {"model": ScoreImportErrorResponse},
            409: {"model": ScoreImportErrorResponse},
            503: {"model": ScoreImportErrorResponse},
        },
        summary="捕获不可变的本地试点汇总评分批次",
    )
    async def create_score_import_batch(
        payload: CreateScoreImportBatchRequest,
        request: Request,
        response: Response,
        idempotency_key: IdempotencyKeyHeader,
        use_case: Annotated[CreateScoreImportBatch, Depends(provide_create)],
    ) -> CreateScoreImportBatchResponse:
        try:
            stored = await use_case.run(
                CreateScoreImportBatchCommand(
                    evaluation_object_id=payload.evaluation_object_id,
                    base_run_id=payload.base_run_id,
                    profile=payload.profile,
                    candidate_items=tuple(
                        item.to_domain() for item in payload.items or ()
                    ),
                    idempotency_key=idempotency_key,
                    per_student=(
                        None
                        if payload.student_items is None
                        or payload.missing_score_policy is None
                        else PerStudentScoreCommandPayload(
                            items=tuple(
                                item.to_domain() for item in payload.student_items
                            ),
                            missing_score_policy=payload.missing_score_policy,
                            score_rate_scale=payload.resolved_score_rate_scale,
                        )
                    ),
                )
            )
        except SCORE_IMPORT_CREATION_ERRORS as error:
            raise score_import_creation_error(
                error,
                evaluation_object_id=payload.evaluation_object_id,
                base_run_id=payload.base_run_id,
            ) from error
        response.headers["Location"] = str(
            request.url_for(
                "get_score_import_batch",
                batch_id=stored.batch.batch_id,
            )
        )
        return CreateScoreImportBatchResponse.from_stored(stored)

    @router.get(
        "/score-import-batches/{batch_id}",
        name="get_score_import_batch",
        response_model=ScoreImportBatchResponse,
        responses={
            404: {"model": ScoreImportErrorResponse},
            503: {"model": ScoreImportErrorResponse},
        },
        summary="读取不可变的本地试点汇总评分批次",
    )
    async def get_score_import_batch(
        batch_id: ScoreImportBatchIdPath,
        use_case: Annotated[GetScoreImportBatch, Depends(provide_get)],
    ) -> ScoreImportBatchResponse:
        try:
            batch = await use_case.run(batch_id)
        except PilotScoreBatchCaptureDisabledError as error:
            raise score_import_disabled_error() from error
        if batch is None:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "score_import_batch_not_found",
                    "message": "未找到指定试点评分批次",
                    "batchId": batch_id,
                },
            )
        return ScoreImportBatchResponse.from_batch(batch)

    return router


__all__ = ["create_score_import_batches_router"]
