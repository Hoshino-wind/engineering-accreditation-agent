from decimal import Decimal
from typing import Annotated, Literal

from pydantic import Field, StrictInt, StrictStr, field_validator

from app.modules.evaluations.contracts.score_import_contract_base import (
    ScoreImportContract,
)
from app.modules.evaluations.domain import (
    ScoreImportCandidateItem,
    canonical_decimal,
)

CanonicalDecimalText = Annotated[
    StrictStr,
    Field(
        min_length=1,
        max_length=32,
        pattern=r"^-?(0|[1-9][0-9]{0,17})(\.[0-9]{1,6})?$",
    ),
]
AggregateStudentCount = Annotated[
    StrictInt,
    Field(ge=0, le=9_223_372_036_854_775_807),
]


class ScoreImportCandidateItemRequest(ScoreImportContract):
    input_id: str = Field(min_length=1, max_length=160)
    earned_points_total: CanonicalDecimalText
    possible_points_total: CanonicalDecimalText
    observed_student_count: AggregateStudentCount

    @field_validator("input_id")
    @classmethod
    def validate_input_id(cls, value: str) -> str:
        if value != value.strip():
            raise ValueError("评分输入 ID 不得包含首尾空白")
        return value

    @field_validator("earned_points_total", "possible_points_total")
    @classmethod
    def validate_canonical_decimal(cls, value: str) -> str:
        if canonical_decimal(Decimal(value)) != value:
            raise ValueError("评分总分必须使用规范 Decimal 字符串")
        return value

    def to_domain(self) -> ScoreImportCandidateItem:
        return ScoreImportCandidateItem(
            input_id=self.input_id,
            earned_points_total=Decimal(self.earned_points_total),
            possible_points_total=Decimal(self.possible_points_total),
            observed_student_count=self.observed_student_count,
        )


class CreateScoreImportBatchRequest(ScoreImportContract):
    evaluation_object_id: str = Field(min_length=1, max_length=160)
    base_run_id: str = Field(min_length=1, max_length=160)
    profile: Literal["local-pilot-aggregate:v1"]
    items: list[ScoreImportCandidateItemRequest] = Field(min_length=1, max_length=200)

    @field_validator("evaluation_object_id", "base_run_id")
    @classmethod
    def validate_opaque_id(cls, value: str) -> str:
        if value != value.strip():
            raise ValueError("ID 不得包含首尾空白")
        return value


__all__ = ["CreateScoreImportBatchRequest", "ScoreImportCandidateItemRequest"]
