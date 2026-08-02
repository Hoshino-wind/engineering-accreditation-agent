from fastapi import HTTPException, status

from app.modules.evaluations.application import (
    PilotScoreBatchCaptureDisabledError,
    ScoreImportBaseRunDoesNotNeedScoreDataError,
    ScoreImportBaseRunMismatchError,
    ScoreImportBaseRunNotFoundError,
    ScoreImportEvaluationObjectNotFoundError,
    ScoreImportIdempotencyConflictError,
    ScoreImportRepositoryConflictError,
)

ScoreImportCreationError = (
    PilotScoreBatchCaptureDisabledError
    | ScoreImportEvaluationObjectNotFoundError
    | ScoreImportBaseRunNotFoundError
    | ScoreImportBaseRunMismatchError
    | ScoreImportBaseRunDoesNotNeedScoreDataError
    | ScoreImportIdempotencyConflictError
    | ScoreImportRepositoryConflictError
)
SCORE_IMPORT_CREATION_ERRORS = (
    PilotScoreBatchCaptureDisabledError,
    ScoreImportEvaluationObjectNotFoundError,
    ScoreImportBaseRunNotFoundError,
    ScoreImportBaseRunMismatchError,
    ScoreImportBaseRunDoesNotNeedScoreDataError,
    ScoreImportIdempotencyConflictError,
    ScoreImportRepositoryConflictError,
)


def score_import_disabled_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail={
            "code": "pilot_score_batch_capture_disabled",
            "message": "试点汇总评分批次捕获未在当前环境启用",
        },
    )


def score_import_creation_error(
    error: ScoreImportCreationError,
    *,
    evaluation_object_id: str,
    base_run_id: str,
) -> HTTPException:
    if isinstance(error, PilotScoreBatchCaptureDisabledError):
        return score_import_disabled_error()
    if isinstance(error, ScoreImportEvaluationObjectNotFoundError):
        return HTTPException(
            status_code=404,
            detail={
                "code": "evaluation_object_not_found",
                "message": "未找到指定评价对象",
                "evaluationObjectId": evaluation_object_id,
            },
        )
    if isinstance(error, ScoreImportBaseRunNotFoundError):
        return HTTPException(
            status_code=404,
            detail={
                "code": "score_import_base_run_not_found",
                "message": "未找到评分批次基准运行",
                "baseRunId": base_run_id,
            },
        )
    if isinstance(error, ScoreImportBaseRunMismatchError):
        return HTTPException(
            status_code=409,
            detail={
                "code": "score_import_base_run_mismatch",
                "message": "基准运行不属于指定评价对象",
                "evaluationObjectId": evaluation_object_id,
                "baseRunId": base_run_id,
            },
        )
    if isinstance(error, ScoreImportBaseRunDoesNotNeedScoreDataError):
        return HTTPException(
            status_code=409,
            detail={
                "code": "score_import_base_run_does_not_need_score_data",
                "message": "基准运行当前没有待处理的汇总评分数据阻断项",
                "baseRunId": base_run_id,
            },
        )
    if isinstance(error, ScoreImportIdempotencyConflictError):
        code = "score_import_idempotency_conflict"
    else:
        code = "score_import_batch_conflict"
    return HTTPException(
        status_code=409,
        detail={"code": code, "message": str(error)},
    )


__all__ = [
    "SCORE_IMPORT_CREATION_ERRORS",
    "ScoreImportCreationError",
    "score_import_creation_error",
    "score_import_disabled_error",
]
