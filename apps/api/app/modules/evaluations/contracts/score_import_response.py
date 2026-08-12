from typing import Literal

from app.modules.evaluations.application import StoredScoreImportBatch
from app.modules.evaluations.contracts.score_import_contract_base import (
    ScoreImportContract,
)
from app.modules.evaluations.domain import (
    SCORE_IMPORT_PROFILE_GRANULARITY,
    PerStudentScoreItem,
    PerStudentSource,
    ScoreImportBatch,
    ScoreImportCandidateItem,
    ScoreRecord,
    ScoreValidationCheck,
    StudentScoreEntry,
    canonical_decimal,
)


class ScoreImportCandidateItemResponse(ScoreImportContract):
    input_id: str
    earned_points_total: str | None
    possible_points_total: str | None
    observed_student_count: int | None

    @classmethod
    def from_item(
        cls,
        item: ScoreImportCandidateItem,
    ) -> "ScoreImportCandidateItemResponse":
        return cls(
            input_id=item.input_id,
            earned_points_total=canonical_decimal(item.earned_points_total),
            possible_points_total=canonical_decimal(item.possible_points_total),
            observed_student_count=item.observed_student_count,
        )


class ScoreRecordResponse(ScoreImportContract):
    record_id: str
    input_id: str
    earned_points_total: str
    possible_points_total: str
    observed_student_count: int
    score_rate: str
    score_rate_scale: int

    @classmethod
    def from_record(cls, record: ScoreRecord) -> "ScoreRecordResponse":
        return cls(
            record_id=record.record_id,
            input_id=record.input_id,
            earned_points_total=canonical_decimal(record.earned_points_total) or "0",
            possible_points_total=canonical_decimal(record.possible_points_total) or "0",
            observed_student_count=record.observed_student_count,
            score_rate=canonical_decimal(record.score_rate) or "0",
            score_rate_scale=record.score_rate_scale,
        )


class StudentScoreEntryResponse(ScoreImportContract):
    student_ref: str
    raw_score: str | None

    @classmethod
    def from_entry(cls, entry: StudentScoreEntry) -> "StudentScoreEntryResponse":
        return cls(
            student_ref=entry.student_ref,
            raw_score=canonical_decimal(entry.raw_score),
        )


class PerStudentScoreItemResponse(ScoreImportContract):
    input_id: str
    max_score: str
    entries: list[StudentScoreEntryResponse]

    @classmethod
    def from_item(cls, item: PerStudentScoreItem) -> "PerStudentScoreItemResponse":
        return cls(
            input_id=item.input_id,
            max_score=canonical_decimal(item.max_score) or "0",
            entries=[StudentScoreEntryResponse.from_entry(entry) for entry in item.entries],
        )


class PerStudentSourceResponse(ScoreImportContract):
    """逐生原始输入回读。

    保留原始分和口径声明，使复核者能够独立重算汇总值，而不必信任服务端的推导。
    """

    missing_score_policy: Literal["exclude", "zero", "block"]
    score_rate_scale: int
    items: list[PerStudentScoreItemResponse]

    @classmethod
    def from_source(cls, source: PerStudentSource) -> "PerStudentSourceResponse":
        return cls(
            missing_score_policy=source.missing_score_policy,
            score_rate_scale=source.score_rate_scale,
            items=[PerStudentScoreItemResponse.from_item(item) for item in source.items],
        )


class ScoreValidationCheckResponse(ScoreImportContract):
    code: str
    status: Literal["pass", "blocked"]
    affected_input_ids: list[str]
    expected: str
    observed: str

    @classmethod
    def from_check(cls, check: ScoreValidationCheck) -> "ScoreValidationCheckResponse":
        return cls(
            code=check.code,
            status=check.status,
            affected_input_ids=list(check.affected_input_ids),
            expected=check.expected,
            observed=check.observed,
        )


class ScoreValidationReportResponse(ScoreImportContract):
    report_id: str
    report_version: str
    validator_version: str
    validation_status: Literal["blocked", "pilot_ready"]
    checks: list[ScoreValidationCheckResponse]
    limitations: list[str]
    report_digest: str
    created_at: str


class ScoreImportBatchResponse(ScoreImportContract):
    batch_id: str
    scope: Literal["local_pilot_aggregate", "local_pilot_per_student"]
    schema_version: Literal["score-import-batch:v1"]
    profile: Literal["local-pilot-aggregate:v1", "local-pilot-per-student:v1"]
    record_granularity: Literal["aggregate", "per_student"]
    formal_usable: Literal[False] = False
    evaluation_object_id: str
    base_run_id: str
    base_context_digest: str
    source_kind: Literal["structured_json"]
    candidate_items: list[ScoreImportCandidateItemResponse]
    records: list[ScoreRecordResponse]
    per_student_source: PerStudentSourceResponse | None = None
    content_digest: str
    created_at: str
    validation_report: ScoreValidationReportResponse

    @classmethod
    def from_batch(cls, batch: ScoreImportBatch) -> "ScoreImportBatchResponse":
        report = batch.validation_report
        return cls(
            batch_id=batch.batch_id,
            scope=batch.scope,
            schema_version="score-import-batch:v1",
            profile=batch.profile,
            record_granularity=SCORE_IMPORT_PROFILE_GRANULARITY[batch.profile],
            per_student_source=(
                None
                if batch.per_student_source is None
                else PerStudentSourceResponse.from_source(batch.per_student_source)
            ),
            evaluation_object_id=batch.evaluation_object_id,
            base_run_id=batch.base_run_id,
            base_context_digest=batch.base_context_digest,
            source_kind=batch.source_kind,
            candidate_items=[
                ScoreImportCandidateItemResponse.from_item(item)
                for item in batch.candidate_items
            ],
            records=[ScoreRecordResponse.from_record(record) for record in batch.records],
            content_digest=batch.content_digest,
            created_at=batch.created_at,
            validation_report=ScoreValidationReportResponse(
                report_id=report.report_id,
                report_version=report.report_version,
                validator_version=report.validator_version,
                validation_status=report.validation_status,
                checks=[
                    ScoreValidationCheckResponse.from_check(check)
                    for check in report.checks
                ],
                limitations=list(report.limitations),
                report_digest=report.report_digest,
                created_at=report.created_at,
            ),
        )


class CreateScoreImportBatchResponse(ScoreImportContract):
    idempotent_replay: bool
    batch: ScoreImportBatchResponse

    @classmethod
    def from_stored(cls, stored: StoredScoreImportBatch) -> "CreateScoreImportBatchResponse":
        return cls(
            idempotent_replay=stored.idempotent_replay,
            batch=ScoreImportBatchResponse.from_batch(stored.batch),
        )


__all__ = ["CreateScoreImportBatchResponse", "ScoreImportBatchResponse"]
