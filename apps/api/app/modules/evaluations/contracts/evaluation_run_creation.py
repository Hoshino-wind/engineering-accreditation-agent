from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.evaluations.application import CreatedEvaluationRun
from app.modules.evaluations.contracts.evaluation_read_model import (
    EvaluationRunDetailResponse,
)
from app.modules.evaluations.contracts.evaluation_run_reference import to_camel


class EvaluationWriteContract(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        extra="forbid",
        populate_by_name=True,
    )


class CreateEvaluationRunRequest(EvaluationWriteContract):
    evaluation_object_id: str = Field(min_length=1, max_length=160)
    source_run_id: str = Field(min_length=1, max_length=160)

    @field_validator("evaluation_object_id", "source_run_id")
    @classmethod
    def validate_opaque_id(cls, value: str) -> str:
        if value != value.strip():
            raise ValueError("ID 不得包含首尾空白")
        return value


class EvaluationRunCreationResponse(EvaluationWriteContract):
    idempotent_replay: bool
    source_run_id: str = Field(min_length=1, max_length=160)
    run: EvaluationRunDetailResponse

    @classmethod
    def from_created(
        cls,
        created: CreatedEvaluationRun,
    ) -> "EvaluationRunCreationResponse":
        source_run_id = created.evaluated.source_run_id
        if source_run_id is None:
            raise ValueError("新建评价运行必须包含来源运行")
        return cls(
            idempotent_replay=created.idempotent_replay,
            source_run_id=source_run_id,
            run=EvaluationRunDetailResponse.from_evaluated(
                created.evaluated
            ),
        )


class EvaluationRunCreationErrorDetail(EvaluationWriteContract):
    code: Literal[
        "evaluation_object_not_found",
        "evaluation_source_run_not_found",
        "evaluation_source_run_mismatch",
        "evaluation_source_run_not_ready",
        "evaluation_run_idempotency_conflict",
    ]
    message: str
    evaluation_object_id: str | None = None
    source_run_id: str | None = None
    blockers: list[str] | None = None


class EvaluationRunCreationErrorResponse(BaseModel):
    detail: EvaluationRunCreationErrorDetail
