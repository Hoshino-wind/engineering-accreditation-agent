from typing import Literal

from pydantic import BaseModel

from app.modules.evaluations.contracts.score_import_contract_base import (
    ScoreImportContract,
)

ScoreImportErrorCode = Literal[
    "pilot_score_batch_capture_disabled",
    "evaluation_object_not_found",
    "score_import_base_run_not_found",
    "score_import_base_run_mismatch",
    "score_import_base_run_does_not_need_score_data",
    "score_import_idempotency_conflict",
    "score_import_batch_conflict",
    "score_import_batch_not_found",
]


class ScoreImportErrorDetail(ScoreImportContract):
    code: ScoreImportErrorCode
    message: str
    evaluation_object_id: str | None = None
    base_run_id: str | None = None
    batch_id: str | None = None


class ScoreImportErrorResponse(BaseModel):
    detail: ScoreImportErrorDetail


__all__ = ["ScoreImportErrorResponse"]
