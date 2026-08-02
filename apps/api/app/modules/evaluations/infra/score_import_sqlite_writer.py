import sqlite3

from app.modules.evaluations.domain import ScoreImportBatch
from app.modules.evaluations.infra.score_import_sqlite_codec import (
    encode_report_payload,
    payload_hash,
)


def insert_score_import_batch(
    connection: sqlite3.Connection,
    *,
    idempotency_key: str,
    request_hash: str,
    batch: ScoreImportBatch,
) -> None:
    _insert_batch_header(connection, batch)
    _insert_candidate_items(connection, batch)
    _insert_records(connection, batch)
    _insert_report(connection, batch)
    connection.execute(
        """
        INSERT INTO evaluation_score_import_commands(
            idempotency_key, operation_version, request_hash, batch_id, created_at
        ) VALUES (?, ?, ?, ?, ?)
        """,
        (
            idempotency_key,
            "create-score-import-batch:v1",
            request_hash,
            batch.batch_id,
            batch.created_at,
        ),
    )


def _insert_batch_header(
    connection: sqlite3.Connection,
    batch: ScoreImportBatch,
) -> None:
    connection.execute(
        """
        INSERT INTO evaluation_score_import_batches(
            batch_id, evaluation_object_id, base_run_id, scope,
            schema_version, profile, source_kind, base_context_digest,
            content_digest, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            batch.batch_id,
            batch.evaluation_object_id,
            batch.base_run_id,
            batch.scope,
            batch.schema_version,
            batch.profile,
            batch.source_kind,
            batch.base_context_digest,
            batch.content_digest,
            batch.created_at,
        ),
    )


def _insert_candidate_items(
    connection: sqlite3.Connection,
    batch: ScoreImportBatch,
) -> None:
    connection.executemany(
        """
        INSERT INTO evaluation_score_import_candidate_items(
            batch_id, item_order, input_id, earned_points_total,
            possible_points_total, observed_student_count
        ) VALUES (?, ?, ?, ?, ?, ?)
        """,
        [
            (
                batch.batch_id,
                index,
                item.input_id,
                None if item.earned_points_total is None else str(item.earned_points_total),
                (
                    None
                    if item.possible_points_total is None
                    else str(item.possible_points_total)
                ),
                item.observed_student_count,
            )
            for index, item in enumerate(batch.candidate_items)
        ],
    )


def _insert_records(
    connection: sqlite3.Connection,
    batch: ScoreImportBatch,
) -> None:
    connection.executemany(
        """
        INSERT INTO evaluation_score_records(
            record_id, batch_id, input_id, earned_points_total,
            possible_points_total, observed_student_count, score_rate
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        [
            (
                record.record_id,
                batch.batch_id,
                record.input_id,
                str(record.earned_points_total),
                str(record.possible_points_total),
                record.observed_student_count,
                str(record.score_rate),
            )
            for record in batch.records
        ],
    )


def _insert_report(
    connection: sqlite3.Connection,
    batch: ScoreImportBatch,
) -> None:
    report_payload = encode_report_payload(batch)
    report = batch.validation_report
    connection.execute(
        """
        INSERT INTO evaluation_score_validation_reports(
            report_id, batch_id, report_version, validator_version,
            validation_status, report_digest, created_at, payload, payload_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            report.report_id,
            batch.batch_id,
            report.report_version,
            report.validator_version,
            report.validation_status,
            report.report_digest,
            report.created_at,
            report_payload,
            payload_hash(report_payload),
        ),
    )


__all__ = ["insert_score_import_batch"]
