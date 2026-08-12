import hashlib
from decimal import ROUND_HALF_UP, Decimal

from .evaluation_read_model import EvaluationRunReadModel
from .score_import_batch import (
    PER_STUDENT_PROFILE,
    PER_STUDENT_SCOPE,
    SCORE_IMPORT_LIMITATIONS,
    SCORE_IMPORT_PROFILE,
    SCORE_IMPORT_REPORT_VERSION,
    SCORE_IMPORT_SCHEMA_VERSION,
    SCORE_IMPORT_SCOPE,
    DataValidationReport,
    ScoreImportBatch,
    ScoreImportCandidateItem,
    ScoreImportValidationStatus,
    ScoreRecord,
)
from .score_import_checks import build_per_student_checks, build_score_import_checks
from .score_import_hashes import (
    per_student_payload,
    score_import_base_context_digest,
    score_import_content_digest,
    score_import_report_digest,
)
from .score_import_per_student import (
    DEFAULT_SCORE_RATE_SCALE,
    MissingScorePolicy,
    PerStudentScoreItem,
    PerStudentSource,
    derive_per_student_items,
)


def _require_ready_value[T](value: T | None, label: str) -> T:
    if value is None:
        raise ValueError(f"试点就绪评分项缺少{label}")
    return value


def _build_records(
    batch_id: str,
    expected_ids: tuple[str, ...],
    candidate_items: tuple[ScoreImportCandidateItem, ...],
    score_rate_scale: int = DEFAULT_SCORE_RATE_SCALE,
) -> tuple[ScoreRecord, ...]:
    item_by_id = {item.input_id: item for item in candidate_items}
    records: list[ScoreRecord] = []
    for input_id in expected_ids:
        item = item_by_id[input_id]
        earned = _require_ready_value(item.earned_points_total, "已得总分")
        possible = _require_ready_value(item.possible_points_total, "应得总分")
        observed = _require_ready_value(item.observed_student_count, "样本量")
        records.append(
            ScoreRecord(
                record_id=(
                    "score-record-"
                    + hashlib.sha256(f"{batch_id}:{input_id}".encode()).hexdigest()[:24]
                ),
                input_id=input_id,
                earned_points_total=earned,
                possible_points_total=possible,
                observed_student_count=observed,
                score_rate=(earned / possible).quantize(
                    Decimal(1).scaleb(-score_rate_scale),
                    rounding=ROUND_HALF_UP,
                ),
                score_rate_scale=score_rate_scale,
            )
        )
    return tuple(records)


def build_score_import_batch(
    *,
    batch_id: str,
    report_id: str,
    created_at: str,
    validator_version: str,
    base_run: EvaluationRunReadModel,
    candidate_items: tuple[ScoreImportCandidateItem, ...],
) -> ScoreImportBatch:
    checks = build_score_import_checks(base_run, candidate_items)
    validation_status: ScoreImportValidationStatus = (
        "blocked" if any(check.status == "blocked" for check in checks) else "pilot_ready"
    )
    base_context_digest = score_import_base_context_digest(base_run)
    content_digest = score_import_content_digest(
        evaluation_object_id=base_run.evaluation_object_id,
        base_run_id=base_run.run_id,
        base_context_digest=base_context_digest,
        profile=SCORE_IMPORT_PROFILE,
        candidate_items=candidate_items,
    )
    records = (
        _build_records(
            batch_id,
            tuple(sorted(item.input_id for item in base_run.inputs)),
            candidate_items,
        )
        if validation_status == "pilot_ready"
        else ()
    )
    report_digest = score_import_report_digest(
        content_digest=content_digest,
        validator_version=validator_version,
        validation_status=validation_status,
        checks=checks,
        limitations=SCORE_IMPORT_LIMITATIONS,
    )
    report = DataValidationReport(
        report_id=report_id,
        batch_id=batch_id,
        report_version=SCORE_IMPORT_REPORT_VERSION,
        validator_version=validator_version,
        validation_status=validation_status,
        checks=checks,
        limitations=SCORE_IMPORT_LIMITATIONS,
        report_digest=report_digest,
        created_at=created_at,
    )
    return ScoreImportBatch(
        batch_id=batch_id,
        scope=SCORE_IMPORT_SCOPE,
        schema_version=SCORE_IMPORT_SCHEMA_VERSION,
        profile=SCORE_IMPORT_PROFILE,
        evaluation_object_id=base_run.evaluation_object_id,
        base_run_id=base_run.run_id,
        base_context_digest=base_context_digest,
        source_kind="structured_json",
        candidate_items=candidate_items,
        records=records,
        content_digest=content_digest,
        created_at=created_at,
        validation_report=report,
    )


def build_per_student_score_import_batch(
    *,
    batch_id: str,
    report_id: str,
    created_at: str,
    validator_version: str,
    base_run: EvaluationRunReadModel,
    items: tuple[PerStudentScoreItem, ...],
    missing_score_policy: MissingScorePolicy,
    score_rate_scale: int = DEFAULT_SCORE_RATE_SCALE,
) -> ScoreImportBatch:
    """由逐生原始分构建评分批次。

    原始分先按声明口径派生为汇总值，再复用汇总口径已有的记录生成与校验流程；
    原始分、满分和口径本身进入内容摘要，因此推导过程可被复核者重演。
    """
    derivations = derive_per_student_items(items, missing_score_policy)
    candidate_items = tuple(derivation.candidate for derivation in derivations)
    checks = build_per_student_checks(base_run, derivations, missing_score_policy)
    validation_status: ScoreImportValidationStatus = (
        "blocked" if any(check.status == "blocked" for check in checks) else "pilot_ready"
    )
    base_context_digest = score_import_base_context_digest(base_run)
    content_digest = score_import_content_digest(
        evaluation_object_id=base_run.evaluation_object_id,
        base_run_id=base_run.run_id,
        base_context_digest=base_context_digest,
        profile=PER_STUDENT_PROFILE,
        candidate_items=candidate_items,
        scope=PER_STUDENT_SCOPE,
        per_student=per_student_payload(
            items=items,
            missing_score_policy=missing_score_policy,
            score_rate_scale=score_rate_scale,
        ),
    )
    records = (
        _build_records(
            batch_id,
            tuple(sorted(item.input_id for item in base_run.inputs)),
            candidate_items,
            score_rate_scale,
        )
        if validation_status == "pilot_ready"
        else ()
    )
    report_digest = score_import_report_digest(
        content_digest=content_digest,
        validator_version=validator_version,
        validation_status=validation_status,
        checks=checks,
        limitations=SCORE_IMPORT_LIMITATIONS,
    )
    report = DataValidationReport(
        report_id=report_id,
        batch_id=batch_id,
        report_version=SCORE_IMPORT_REPORT_VERSION,
        validator_version=validator_version,
        validation_status=validation_status,
        checks=checks,
        limitations=SCORE_IMPORT_LIMITATIONS,
        report_digest=report_digest,
        created_at=created_at,
    )
    return ScoreImportBatch(
        batch_id=batch_id,
        scope=PER_STUDENT_SCOPE,
        schema_version=SCORE_IMPORT_SCHEMA_VERSION,
        profile=PER_STUDENT_PROFILE,
        evaluation_object_id=base_run.evaluation_object_id,
        base_run_id=base_run.run_id,
        base_context_digest=base_context_digest,
        source_kind="structured_json",
        candidate_items=candidate_items,
        records=records,
        content_digest=content_digest,
        created_at=created_at,
        validation_report=report,
        per_student_source=PerStudentSource(
            items=items,
            missing_score_policy=missing_score_policy,
            score_rate_scale=score_rate_scale,
        ),
    )


__all__ = ["build_per_student_score_import_batch", "build_score_import_batch"]
