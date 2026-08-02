from collections.abc import Callable
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
    status,
)

from app.modules.evaluations.application import (
    CreateEvaluationRun,
    CreateEvaluationRunCommand,
    EvaluationObjectNotFoundError,
    EvaluationRunIdempotencyConflictError,
    EvaluationSourceRunMismatchError,
    EvaluationSourceRunNotFoundError,
    EvaluationSourceRunNotReadyError,
)
from app.modules.evaluations.contracts import (
    CreateEvaluationRunRequest,
    EvaluationRunCreationErrorResponse,
    EvaluationRunCreationResponse,
)
from app.modules.evaluations.routes.evaluation_route_params import (
    IdempotencyKeyHeader,
)


def create_evaluation_run_router(
    provide_create_run: Callable[[], CreateEvaluationRun],
) -> APIRouter:
    router = APIRouter()

    @router.post(
        "/runs",
        response_model=EvaluationRunCreationResponse,
        status_code=status.HTTP_201_CREATED,
        responses={
            201: {
                "description": "试点重算运行已创建或按幂等键恢复",
                "headers": {
                    "Location": {
                        "description": "新运行的权威详情地址",
                        "schema": {"type": "string", "format": "uri"},
                    }
                },
            },
            404: {
                "description": "评价对象或来源运行不存在",
                "model": EvaluationRunCreationErrorResponse,
            },
            409: {
                "description": "来源快照不可执行或幂等键冲突",
                "model": EvaluationRunCreationErrorResponse,
            },
        },
        summary="基于已就绪的不可变输入快照创建试点重算运行",
    )
    async def create_evaluation_run(
        payload: CreateEvaluationRunRequest,
        request: Request,
        response: Response,
        idempotency_key: IdempotencyKeyHeader,
        use_case: Annotated[
            CreateEvaluationRun,
            Depends(provide_create_run),
        ],
    ) -> EvaluationRunCreationResponse:
        try:
            created = await use_case.run(
                CreateEvaluationRunCommand(
                    evaluation_object_id=payload.evaluation_object_id,
                    source_run_id=payload.source_run_id,
                    idempotency_key=idempotency_key,
                )
            )
        except EvaluationObjectNotFoundError as error:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "evaluation_object_not_found",
                    "message": "未找到指定评价对象",
                    "evaluationObjectId": payload.evaluation_object_id,
                },
            ) from error
        except EvaluationSourceRunNotFoundError as error:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "evaluation_source_run_not_found",
                    "message": "未找到来源评价运行",
                    "sourceRunId": payload.source_run_id,
                },
            ) from error
        except EvaluationSourceRunMismatchError as error:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "evaluation_source_run_mismatch",
                    "message": "来源运行不属于指定评价对象",
                    "evaluationObjectId": payload.evaluation_object_id,
                    "sourceRunId": payload.source_run_id,
                },
            ) from error
        except EvaluationSourceRunNotReadyError as error:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "evaluation_source_run_not_ready",
                    "message": "来源运行的评价输入尚未就绪",
                    "sourceRunId": payload.source_run_id,
                    "blockers": list(error.blockers),
                },
            ) from error
        except EvaluationRunIdempotencyConflictError as error:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "evaluation_run_idempotency_conflict",
                    "message": str(error),
                },
            ) from error

        response.headers["Location"] = str(
            request.url_for(
                "get_evaluation_run",
                run_id=created.evaluated.run.run_id,
            )
        )
        return EvaluationRunCreationResponse.from_created(created)

    return router
