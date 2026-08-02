from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.modules.evaluations.domain import EvaluationRunReference


def to_camel(value: str) -> str:
    head, *tail = value.split("_")
    return head + "".join(part.capitalize() for part in tail)


class EvaluationRunReferenceResponse(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        extra="forbid",
        populate_by_name=True,
    )

    run_id: str = Field(min_length=1, max_length=160)
    evaluation_object_id: str = Field(min_length=1, max_length=160)

    @classmethod
    def from_reference(
        cls,
        reference: EvaluationRunReference,
    ) -> "EvaluationRunReferenceResponse":
        return cls(
            run_id=reference.run_id,
            evaluation_object_id=reference.evaluation_object_id,
        )


class EvaluationRunReferenceNotFoundDetail(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        extra="forbid",
        populate_by_name=True,
    )

    code: Literal["evaluation_run_not_found"]
    message: str
    run_id: str = Field(min_length=1, max_length=160)


class EvaluationRunReferenceNotFoundResponse(BaseModel):
    detail: EvaluationRunReferenceNotFoundDetail
