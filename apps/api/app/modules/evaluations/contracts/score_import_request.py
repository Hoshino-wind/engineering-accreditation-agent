from decimal import Decimal
from typing import Annotated, Literal

from pydantic import Field, StrictInt, StrictStr, field_validator, model_validator

from app.modules.evaluations.contracts.score_import_contract_base import (
    ScoreImportContract,
)
from app.modules.evaluations.domain import (
    DEFAULT_SCORE_RATE_SCALE,
    MAX_SCORE_RATE_SCALE,
    MIN_SCORE_RATE_SCALE,
    PER_STUDENT_PROFILE,
    SCORE_IMPORT_PROFILE,
    MissingScorePolicy,
    PerStudentScoreItem,
    ScoreImportCandidateItem,
    StudentScoreEntry,
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


class StudentScoreEntryRequest(ScoreImportContract):
    """一名学生在一个评分项上的原始分。``rawScore`` 为 null 表示缺考。"""

    student_ref: str = Field(min_length=1, max_length=64)
    raw_score: CanonicalDecimalText | None = None

    @field_validator("student_ref")
    @classmethod
    def validate_student_ref(cls, value: str) -> str:
        if value != value.strip():
            raise ValueError("学生代号不得包含首尾空白")
        return value

    @field_validator("raw_score")
    @classmethod
    def validate_raw_score(cls, value: str | None) -> str | None:
        if value is not None and canonical_decimal(Decimal(value)) != value:
            raise ValueError("原始分必须使用规范 Decimal 字符串")
        return value

    def to_domain(self) -> StudentScoreEntry:
        return StudentScoreEntry(
            student_ref=self.student_ref,
            raw_score=None if self.raw_score is None else Decimal(self.raw_score),
        )


class PerStudentScoreItemRequest(ScoreImportContract):
    input_id: str = Field(min_length=1, max_length=160)
    max_score: CanonicalDecimalText
    entries: list[StudentScoreEntryRequest] = Field(min_length=1, max_length=2000)

    @field_validator("input_id")
    @classmethod
    def validate_input_id(cls, value: str) -> str:
        if value != value.strip():
            raise ValueError("评分输入 ID 不得包含首尾空白")
        return value

    @field_validator("max_score")
    @classmethod
    def validate_max_score(cls, value: str) -> str:
        if canonical_decimal(Decimal(value)) != value:
            raise ValueError("评分项满分必须使用规范 Decimal 字符串")
        return value

    def to_domain(self) -> PerStudentScoreItem:
        return PerStudentScoreItem(
            input_id=self.input_id,
            max_score=Decimal(self.max_score),
            entries=tuple(entry.to_domain() for entry in self.entries),
        )


class CreateScoreImportBatchRequest(ScoreImportContract):
    """创建评分批次。

    ``profile`` 决定使用哪一组字段：

    - ``local-pilot-aggregate:v1``：填 ``items``（每个评分项的汇总总分）；
    - ``local-pilot-per-student:v1``：填 ``studentItems``、``missingScorePolicy``
      和 ``scoreRateScale``（逐生原始分，由服务端派生汇总值）。

    逐生口径把缺失值处理和舍入时机从表格里搬进服务端，并纳入内容摘要，
    因此汇总值可以被复核者从原始分重新推导。
    """

    evaluation_object_id: str = Field(min_length=1, max_length=160)
    base_run_id: str = Field(min_length=1, max_length=160)
    profile: Literal["local-pilot-aggregate:v1", "local-pilot-per-student:v1"]
    items: list[ScoreImportCandidateItemRequest] | None = Field(
        default=None, min_length=1, max_length=200
    )
    student_items: list[PerStudentScoreItemRequest] | None = Field(
        default=None, min_length=1, max_length=200
    )
    missing_score_policy: MissingScorePolicy | None = None
    score_rate_scale: Annotated[
        StrictInt, Field(ge=MIN_SCORE_RATE_SCALE, le=MAX_SCORE_RATE_SCALE)
    ] | None = None

    @field_validator("evaluation_object_id", "base_run_id")
    @classmethod
    def validate_opaque_id(cls, value: str) -> str:
        if value != value.strip():
            raise ValueError("ID 不得包含首尾空白")
        return value

    @model_validator(mode="after")
    def validate_profile_fields(self) -> "CreateScoreImportBatchRequest":
        if self.profile == SCORE_IMPORT_PROFILE:
            if self.items is None:
                raise ValueError("汇总口径必须提供 items")
            for name, value in (
                ("studentItems", self.student_items),
                ("missingScorePolicy", self.missing_score_policy),
                ("scoreRateScale", self.score_rate_scale),
            ):
                if value is not None:
                    raise ValueError(f"汇总口径不得提供 {name}")
        elif self.profile == PER_STUDENT_PROFILE:
            if self.student_items is None:
                raise ValueError("逐生口径必须提供 studentItems")
            if self.missing_score_policy is None:
                raise ValueError("逐生口径必须显式声明 missingScorePolicy")
            if self.items is not None:
                raise ValueError("逐生口径不得提供 items；汇总值由服务端派生")
        return self

    @property
    def resolved_score_rate_scale(self) -> int:
        return (
            DEFAULT_SCORE_RATE_SCALE
            if self.score_rate_scale is None
            else self.score_rate_scale
        )


__all__ = ["CreateScoreImportBatchRequest", "ScoreImportCandidateItemRequest"]
