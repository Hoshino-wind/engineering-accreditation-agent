import json
import sqlite3
from decimal import Decimal
from typing import Any, cast

from app.modules.evaluations.domain import (
    SCORE_IMPORT_PROFILE,
    SCORE_IMPORT_REPORT_VERSION,
    SCORE_IMPORT_SCHEMA_VERSION,
    SCORE_IMPORT_SCOPE,
    DataValidationReport,
    ScoreImportBatch,
    ScoreImportCandidateItem,
    ScoreImportValidationStatus,
    ScoreRecord,
    ScoreValidationCheck,
    ScoreValidationCheckStatus,
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


def _decode_records(record_rows: list[sqlite3.Row]) -> tuple[ScoreRecord, ...]:
    return tuple(
        ScoreRecord(
            record_id=str(row["record_id"]),
            input_id=str(row["input_id"]),
            earned_points_total=Decimal(str(row["earned_points_total"])),
            possible_points_total=Decimal(str(row["possible_points_total"])),
            observed_student_count=int(row["observed_student_count"]),
            score_rate=Decimal(str(row["score_rate"])),
        )
        for row in record_rows
    )


def decode_score_import_batch(
    *,
    batch_row: sqlite3.Row,
    item_rows: list[sqlite3.Row],
    record_rows: list[sqlite3.Row],
    report_row: sqlite3.Row,
) -> ScoreImportBatch:
    batch_id = str(batch_row["batch_id"])
    report = _decode_report(report_row, batch_id)
    candidate_items = _decode_candidates(item_rows)
    records = _decode_records(record_rows)
    if (
        str(batch_row["scope"]) != SCORE_IMPORT_SCOPE
        or str(batch_row["schema_version"]) != SCORE_IMPORT_SCHEMA_VERSION
        or str(batch_row["profile"]) != SCORE_IMPORT_PROFILE
        or str(batch_row["source_kind"]) != "structured_json"
        or report.report_version != SCORE_IMPORT_REPORT_VERSION
    ):
        raise ScoreImportRepositorySchemaError("评分批次契约版本不受支持")
    content_digest = score_import_content_digest(
        evaluation_object_id=str(batch_row["evaluation_object_id"]),
        base_run_id=str(batch_row["base_run_id"]),
        base_context_digest=str(batch_row["base_context_digest"]),
        profile=SCORE_IMPORT_PROFILE,
        candidate_items=candidate_items,
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
        scope=SCORE_IMPORT_SCOPE,
        schema_version=SCORE_IMPORT_SCHEMA_VERSION,
        profile=SCORE_IMPORT_PROFILE,
        evaluation_object_id=str(batch_row["evaluation_object_id"]),
        base_run_id=str(batch_row["base_run_id"]),
        base_context_digest=str(batch_row["base_context_digest"]),
        source_kind="structured_json",
        candidate_items=candidate_items,
        records=records,
        content_digest=content_digest,
        created_at=str(batch_row["created_at"]),
        validation_report=report,
    )


__all__ = ["decode_score_import_batch"]
