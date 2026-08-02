import sqlite3

from app.modules.evaluations.application.score_import_ports import (
    ScoreImportIdempotencyConflictError,
    StoredScoreImportBatch,
)
from app.modules.evaluations.domain import ScoreImportBatch
from app.modules.evaluations.infra.score_import_sqlite_codec import (
    ScoreImportRepositorySchemaError,
)
from app.modules.evaluations.infra.score_import_sqlite_decoder import (
    decode_score_import_batch,
)


def load_score_import_batch(
    connection: sqlite3.Connection,
    batch_id: str,
) -> ScoreImportBatch | None:
    batch_row = connection.execute(
        "SELECT * FROM evaluation_score_import_batches WHERE batch_id = ?",
        (batch_id,),
    ).fetchone()
    if batch_row is None:
        return None
    item_rows = connection.execute(
        """
        SELECT input_id, earned_points_total, possible_points_total,
               observed_student_count
        FROM evaluation_score_import_candidate_items
        WHERE batch_id = ? ORDER BY item_order ASC
        """,
        (batch_id,),
    ).fetchall()
    record_rows = connection.execute(
        """
        SELECT record_id, input_id, earned_points_total, possible_points_total,
               observed_student_count, score_rate
        FROM evaluation_score_records
        WHERE batch_id = ? ORDER BY input_id ASC
        """,
        (batch_id,),
    ).fetchall()
    report_row = connection.execute(
        "SELECT * FROM evaluation_score_validation_reports WHERE batch_id = ?",
        (batch_id,),
    ).fetchone()
    if report_row is None:
        raise ScoreImportRepositorySchemaError("评分批次缺少不可变校验报告")
    return decode_score_import_batch(
        batch_row=batch_row,
        item_rows=item_rows,
        record_rows=record_rows,
        report_row=report_row,
    )


def load_created_score_import_batch(
    connection: sqlite3.Connection,
    *,
    idempotency_key: str,
    request_hash: str,
) -> StoredScoreImportBatch | None:
    row = connection.execute(
        """
        SELECT request_hash, batch_id FROM evaluation_score_import_commands
        WHERE idempotency_key = ?
        """,
        (idempotency_key,),
    ).fetchone()
    if row is None:
        return None
    if str(row["request_hash"]) != request_hash:
        raise ScoreImportIdempotencyConflictError(
            "幂等键已用于其他试点评分批次请求"
        )
    batch = load_score_import_batch(connection, str(row["batch_id"]))
    if batch is None:
        raise ScoreImportRepositorySchemaError("评分批次幂等记录缺少目标批次")
    return StoredScoreImportBatch(batch=batch, idempotent_replay=True)


__all__ = ["load_created_score_import_batch", "load_score_import_batch"]
