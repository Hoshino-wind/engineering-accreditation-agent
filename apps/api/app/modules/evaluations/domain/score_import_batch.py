from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from typing import TYPE_CHECKING, Literal

if TYPE_CHECKING:
    from .score_import_per_student import PerStudentSource

ScoreImportScope = Literal["local_pilot_aggregate", "local_pilot_per_student"]
ScoreImportProfile = Literal["local-pilot-aggregate:v1", "local-pilot-per-student:v1"]
ScoreImportRecordGranularity = Literal["aggregate", "per_student"]
ScoreImportValidationStatus = Literal["blocked", "pilot_ready"]
ScoreValidationCheckStatus = Literal["pass", "blocked"]

SCORE_IMPORT_SCOPE: ScoreImportScope = "local_pilot_aggregate"
SCORE_IMPORT_PROFILE: ScoreImportProfile = "local-pilot-aggregate:v1"
PER_STUDENT_SCOPE: ScoreImportScope = "local_pilot_per_student"
PER_STUDENT_PROFILE: ScoreImportProfile = "local-pilot-per-student:v1"

# profile → (scope, 记录粒度)。新增口径必须在此登记，批次校验以本表为准。
SCORE_IMPORT_PROFILE_SCOPES: dict[ScoreImportProfile, ScoreImportScope] = {
    SCORE_IMPORT_PROFILE: SCORE_IMPORT_SCOPE,
    PER_STUDENT_PROFILE: PER_STUDENT_SCOPE,
}
SCORE_IMPORT_PROFILE_GRANULARITY: dict[ScoreImportProfile, ScoreImportRecordGranularity] = {
    SCORE_IMPORT_PROFILE: "aggregate",
    PER_STUDENT_PROFILE: "per_student",
}
SCORE_IMPORT_SCHEMA_VERSION = "score-import-batch:v1"
SCORE_IMPORT_REPORT_VERSION = "score-import-validation:v1"
SCORE_IMPORT_LIMITATIONS = (
    "source_file_not_bound",
    "student_records_not_verified",
    "scope_not_authorized",
    "actor_not_authenticated",
    "formal_audit_unavailable",
    "graph_policy_not_revalidated",
)


def require_opaque_id(value: str, label: str) -> None:
    if not value or value != value.strip():
        raise ValueError(f"{label}不能为空且不得包含首尾空白")


def canonical_decimal(value: Decimal | None) -> str | None:
    if value is None:
        return None
    if not value.is_finite():
        raise ValueError("评分总分必须是有限数值")
    if value == 0:
        return "0"
    return format(value.normalize(), "f")


@dataclass(frozen=True, slots=True)
class ScoreImportCandidateItem:
    input_id: str
    earned_points_total: Decimal | None
    possible_points_total: Decimal | None
    observed_student_count: int | None

    def __post_init__(self) -> None:
        require_opaque_id(self.input_id, "评分输入 ID")
        canonical_decimal(self.earned_points_total)
        canonical_decimal(self.possible_points_total)


@dataclass(frozen=True, slots=True)
class ScoreRecord:
    record_id: str
    input_id: str
    earned_points_total: Decimal
    possible_points_total: Decimal
    observed_student_count: int
    score_rate: Decimal
    # 得分率定标位数。汇总口径固定 6 位；逐生口径由调用方声明，
    # 因为舍入时机会改变最终达成度，必须是可审计的显式决定而不是实现细节。
    score_rate_scale: int = 6

    def __post_init__(self) -> None:
        require_opaque_id(self.record_id, "评分记录 ID")
        require_opaque_id(self.input_id, "评分输入 ID")
        canonical_decimal(self.earned_points_total)
        canonical_decimal(self.possible_points_total)
        canonical_decimal(self.score_rate)
        if self.earned_points_total < 0:
            raise ValueError("规范评分已得总分不能为负数")
        if self.possible_points_total <= 0:
            raise ValueError("规范评分应得总分必须大于零")
        if self.earned_points_total > self.possible_points_total:
            raise ValueError("规范评分已得总分不得超过应得总分")
        if self.score_rate < 0 or self.score_rate > 1:
            raise ValueError("规范评分得分率必须位于 0 到 1 之间")
        if self.observed_student_count < 1:
            raise ValueError("规范评分样本量必须为正整数")
        if not 1 <= self.score_rate_scale <= 6:
            raise ValueError("规范评分得分率定标位数必须位于 1 到 6 之间")


@dataclass(frozen=True, slots=True)
class ScoreValidationCheck:
    code: str
    status: ScoreValidationCheckStatus
    affected_input_ids: tuple[str, ...]
    expected: str
    observed: str

    def __post_init__(self) -> None:
        require_opaque_id(self.code, "校验代码")


@dataclass(frozen=True, slots=True)
class DataValidationReport:
    report_id: str
    batch_id: str
    report_version: str
    validator_version: str
    validation_status: ScoreImportValidationStatus
    checks: tuple[ScoreValidationCheck, ...]
    limitations: tuple[str, ...]
    report_digest: str
    created_at: str

    def __post_init__(self) -> None:
        require_opaque_id(self.report_id, "评分校验报告 ID")
        require_opaque_id(self.batch_id, "评分批次 ID")
        if self.report_version != SCORE_IMPORT_REPORT_VERSION:
            raise ValueError("评分校验报告版本不受支持")
        if self.validation_status == "pilot_ready" and any(
            check.status == "blocked" for check in self.checks
        ):
            raise ValueError("试点就绪报告不得包含阻断检查")


@dataclass(frozen=True, slots=True)
class ScoreImportBatch:
    batch_id: str
    scope: ScoreImportScope
    schema_version: str
    profile: ScoreImportProfile
    evaluation_object_id: str
    base_run_id: str
    base_context_digest: str
    source_kind: Literal["structured_json"]
    candidate_items: tuple[ScoreImportCandidateItem, ...]
    records: tuple[ScoreRecord, ...]
    content_digest: str
    created_at: str
    validation_report: DataValidationReport
    # 仅逐生口径填充：保留原始分、满分与口径声明，供复核者重新推导汇总值。
    per_student_source: "PerStudentSource | None" = None

    def __post_init__(self) -> None:
        require_opaque_id(self.batch_id, "评分批次 ID")
        require_opaque_id(self.evaluation_object_id, "评价对象 ID")
        require_opaque_id(self.base_run_id, "基准运行 ID")
        if (self.profile == PER_STUDENT_PROFILE) != (self.per_student_source is not None):
            raise ValueError("逐生评分批次必须且只能由逐生口径保留原始输入")
        if self.schema_version != SCORE_IMPORT_SCHEMA_VERSION:
            raise ValueError("评分批次版本不受支持")
        if self.profile not in SCORE_IMPORT_PROFILE_SCOPES:
            raise ValueError("评分批次配置不受支持")
        if self.scope != SCORE_IMPORT_PROFILE_SCOPES[self.profile]:
            raise ValueError("评分批次范围与配置不一致")
        if self.validation_report.batch_id != self.batch_id:
            raise ValueError("评分批次与校验报告归属不一致")
        if self.validation_report.validation_status == "pilot_ready":
            if len(self.records) != len(self.candidate_items):
                raise ValueError("试点就绪批次必须完整生成规范评分记录")
            candidates = {item.input_id: item for item in self.candidate_items}
            if len(candidates) != len(self.candidate_items):
                raise ValueError("试点就绪批次不得包含重复评分输入")
            if {record.input_id for record in self.records} != set(candidates):
                raise ValueError("规范评分记录未完整覆盖候选评分输入")
            for record in self.records:
                candidate = candidates[record.input_id]
                if (
                    candidate.earned_points_total != record.earned_points_total
                    or candidate.possible_points_total != record.possible_points_total
                    or candidate.observed_student_count != record.observed_student_count
                ):
                    raise ValueError("规范评分记录与候选评分输入不一致")
                expected_rate = (
                    record.earned_points_total / record.possible_points_total
                ).quantize(
                    Decimal(1).scaleb(-record.score_rate_scale),
                    rounding=ROUND_HALF_UP,
                )
                if record.score_rate != expected_rate:
                    raise ValueError("规范评分记录得分率不是由总分确定性计算得出")
        elif self.records:
            raise ValueError("阻断批次不得生成部分规范评分记录")


__all__ = [
    "DataValidationReport",
    "PER_STUDENT_PROFILE",
    "PER_STUDENT_SCOPE",
    "SCORE_IMPORT_LIMITATIONS",
    "SCORE_IMPORT_PROFILE",
    "SCORE_IMPORT_PROFILE_GRANULARITY",
    "SCORE_IMPORT_PROFILE_SCOPES",
    "SCORE_IMPORT_REPORT_VERSION",
    "SCORE_IMPORT_SCHEMA_VERSION",
    "SCORE_IMPORT_SCOPE",
    "ScoreImportBatch",
    "ScoreImportCandidateItem",
    "ScoreImportProfile",
    "ScoreImportRecordGranularity",
    "ScoreImportScope",
    "ScoreImportValidationStatus",
    "ScoreRecord",
    "ScoreValidationCheck",
    "ScoreValidationCheckStatus",
    "canonical_decimal",
    "require_opaque_id",
]
