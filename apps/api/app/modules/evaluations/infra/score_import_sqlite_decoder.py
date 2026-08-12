import json
import sqlite3
from decimal import Decimal
from typing import Any, cast

from app.modules.evaluations.domain import (
    DEFAULT_SCORE_RATE_SCALE,
    PER_STUDENT_PROFILE,
    SCORE_IMPORT_PROFILE_SCOPES,
    SCORE_IMPORT_REPORT_VERSION,
    SCORE_IMPORT_SCHEMA_VERSION,
    DataValidationReport,
    MissingScorePolicy,
    PerStudentScoreItem,
    PerStudentSource,
    ScoreImportBatch,
    ScoreImportCandidateItem,
    ScoreImportProfile,
    ScoreImportScope,
    ScoreImportValidationStatus,
    ScoreRecord,
    ScoreValidationCheck,
    ScoreValidationCheckStatus,
    StudentScoreEntry,
    per_student_payload,
    score_import_content_digest,
    score_import_report_digest,
)
from app.modules.evaluations.infra.score_import_sqlite_codec import (
    ScoreImportRepositorySchemaError,
    payload_hash,
)


def _decode_report(report_row: sqlite3.Row, batch_id: str) -> DataValidationReport:
    report_payload = str(report_row["payload"])
    if payload_hash(report_payload) != str(report_row["payload_hash"]):
        raise ScoreImportRepositorySchemaError("评分批次校验报告完整性校验失败")
    decoded: Any = json.loads(report_payload)
    if not isinstance(decoded, dict):
        raise ScoreImportRepositorySchemaError("评分批次校验报告结构无效")
    checks_raw = decoded.get("checks")
    limitations_raw = decoded.get("limitations")
    if not isinstance(checks_raw, list) or not isinstance(limitations_raw, list):
        raise ScoreImportRepositorySchemaError("评分批次校验报告字段无效")
    checks = tuple(
        ScoreValidationCheck(
            code=str(item["code"]),
            status=cast(ScoreValidationCheckStatus, item["status"]),
            affected_input_ids=tuple(str(value) for value in item["affected_input_ids"]),
            expected=str(item["expected"]),
            observed=str(item["observed"]),
        )
        for item in checks_raw
        if isinstance(item, dict)
    )
    if len(checks) != len(checks_raw):
        raise ScoreImportRepositorySchemaError("评分批次校验检查结构无效")
    return DataValidationReport(
        report_id=str(report_row["report_id"]),
        batch_id=batch_id,
        report_version=str(report_row["report_version"]),
        validator_version=str(report_row["validator_version"]),
        validation_status=cast(
            ScoreImportValidationStatus,
            report_row["validation_status"],
        ),
        checks=checks,
        limitations=tuple(str(item) for item in limitations_raw),
        report_digest=str(report_row["report_digest"]),
        created_at=str(report_row["created_at"]),
    )


def _decode_candidates(item_rows: list[sqlite3.Row]) -> tuple[ScoreImportCandidateItem, ...]:
    return tuple(
        ScoreImportCandidateItem(
            input_id=str(row["input_id"]),
            earned_points_total=(
                None
                if row["earned_points_total"] is None
                else Decimal(str(row["earned_points_total"]))
            ),
            possible_points_total=(
                None
                if row["possible_points_total"] is None
                else Decimal(str(row["possible_points_total"]))
            ),
            observed_student_count=(
                None
                if row["observed_student_count"] is None
                else int(row["observed_student_count"])
            ),
        )
        for row in item_rows
    )


def _decode_records(
    record_rows: list[sqlite3.Row],
    score_rate_scale: int,
) -> tuple[ScoreRecord, ...]:
    return tuple(
        ScoreRecord(
            record_id=str(row["record_id"]),
            input_id=str(row["input_id"]),
            earned_points_total=Decimal(str(row["earned_points_total"])),
            possible_points_total=Decimal(str(row["possible_points_total"])),
            observed_student_count=int(row["observed_student_count"]),
            score_rate=Decimal(str(row["score_rate"])),
            score_rate_scale=score_rate_scale,
        )
        for row in record_rows
    )


def _decode_per_student_source(
    source_row: sqlite3.Row | None,
    entry_rows: list[sqlite3.Row],
) -> PerStudentSource | None:
    if source_row is None:
        return None
    grouped: dict[str, list[StudentScoreEntry]] = {}
    max_scores: dict[str, Decimal] = {}
    for row in entry_rows:
        input_id = str(row["input_id"])
        max_scores.setdefault(input_id, Decimal(str(row["max_score"])))
        grouped.setdefault(input_id, []).append(
            StudentScoreEntry(
                student_ref=str(row["student_ref"]),
                raw_score=(
                    None if row["raw_score"] is None else Decimal(str(row["raw_score"]))
                ),
            )
        )
    if not grouped:
        raise ScoreImportRepositorySchemaError("逐生评分批次缺少原始评分行")
    return PerStudentSource(
        items=tuple(
            PerStudentScoreItem(
                input_id=input_id,
                max_score=max_scores[input_id],
                entries=tuple(entries),
            )
            for input_id, entries in grouped.items()
        ),
        missing_score_policy=cast(
            MissingScorePolicy, source_row["missing_score_policy"]
        ),
        score_rate_scale=int(source_row["score_rate_scale"]),
    )


def decode_score_import_batch(
    *,
    batch_row: sqlite3.Row,
    item_rows: list[sqlite3.Row],
    record_rows: list[sqlite3.Row],
    report_row: sqlite3.Row,
    source_row: sqlite3.Row | None = None,
    entry_rows: list[sqlite3.Row] | None = None,
) -> ScoreImportBatch:
    batch_id = str(batch_row["batch_id"])
    report = _decode_report(report_row, batch_id)
    candidate_items = _decode_candidates(item_rows)
    source = _decode_per_student_source(source_row, entry_rows or [])
    profile = cast(ScoreImportProfile, str(batch_row["profile"]))
    scope = cast(ScoreImportScope, str(batch_row["scope"]))
    records = _decode_records(
        record_rows,
        DEFAULT_SCORE_RATE_SCALE if source is None else source.score_rate_scale,
    )
    if (
        profile not in SCORE_IMPORT_PROFILE_SCOPES
        or scope != SCORE_IMPORT_PROFILE_SCOPES[profile]
        or str(batch_row["schema_version"]) != SCORE_IMPORT_SCHEMA_VERSION
        or str(batch_row["source_kind"]) != "structured_json"
        or report.report_version != SCORE_IMPORT_REPORT_VERSION
        or (profile == PER_STUDENT_PROFILE) != (source is not None)
    ):
        raise ScoreImportRepositorySchemaError("评分批次契约版本不受支持")
    # 摘要在读取时重算：逐生原始分同样参与，因此篡改任何一格分数都会被发现。
    content_digest = score_import_content_digest(
        evaluation_object_id=str(batch_row["evaluation_object_id"]),
        base_run_id=str(batch_row["base_run_id"]),
        base_context_digest=str(batch_row["base_context_digest"]),
        profile=profile,
        candidate_items=candidate_items,
        scope=scope,
        per_student=(
            None
            if source is None
            else per_student_payload(
                items=source.items,
                missing_score_policy=source.missing_score_policy,
                score_rate_scale=source.score_rate_scale,
            )
        ),
    )
    if content_digest != str(batch_row["content_digest"]):
        raise ScoreImportRepositorySchemaError("评分批次内容摘要不一致")
    report_digest = score_import_report_digest(
        content_digest=content_digest,
        validator_version=report.validator_version,
        validation_status=report.validation_status,
        checks=report.checks,
        limitations=report.limitations,
    )
    if report_digest != report.report_digest:
        raise ScoreImportRepositorySchemaError("评分批次报告摘要不一致")
    return ScoreImportBatch(
        batch_id=batch_id,
        scope=scope,
        schema_version=SCORE_IMPORT_SCHEMA_VERSION,
        profile=profile,
        evaluation_object_id=str(batch_row["evaluation_object_id"]),
        base_run_id=str(batch_row["base_run_id"]),
        base_context_digest=str(batch_row["base_context_digest"]),
        source_kind="structured_json",
        candidate_items=candidate_items,
        records=records,
        content_digest=content_digest,
        created_at=str(batch_row["created_at"]),
        validation_report=report,
        per_student_source=source,
    )


__all__ = ["decode_score_import_batch"]
