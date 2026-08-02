import hashlib
import json
import sqlite3
from dataclasses import asdict
from decimal import Decimal

from app.modules.evaluations.domain import (
    ScoreImportBatch,
    score_import_base_context_digest,
)
from app.modules.evaluations.infra.pilot_seed import evaluation_run_from_payload


class ScoreImportRepositorySchemaError(RuntimeError):
    pass


def _json_ready(value: object) -> object:
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, dict):
        return {key: _json_ready(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_ready(item) for item in value]
    return value


def canonical_payload(value: object) -> str:
    return json.dumps(
        _json_ready(value),
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )


def payload_hash(payload: str) -> str:
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def encode_report_payload(batch: ScoreImportBatch) -> str:
    return canonical_payload(
        {
            "checks": [asdict(check) for check in batch.validation_report.checks],
            "limitations": batch.validation_report.limitations,
        }
    )


def validate_base_context(
    connection: sqlite3.Connection,
    batch: ScoreImportBatch,
) -> None:
    row = connection.execute(
        """
        SELECT evaluation_object_id, payload, payload_hash
        FROM evaluation_run_read_models WHERE run_id = ?
        """,
        (batch.base_run_id,),
    ).fetchone()
    if row is None or str(row["evaluation_object_id"]) != batch.evaluation_object_id:
        raise ValueError("评分批次基准运行归属已发生变化")
    payload = str(row["payload"])
    if payload_hash(payload) != str(row["payload_hash"]):
        raise ScoreImportRepositorySchemaError("评分批次基准运行完整性校验失败")
    decoded = json.loads(payload)
    if not isinstance(decoded, dict):
        raise ScoreImportRepositorySchemaError("评分批次基准运行结构无效")
    run = evaluation_run_from_payload(decoded)
    if score_import_base_context_digest(run) != batch.base_context_digest:
        raise ValueError("评分批次基准输入定义已发生变化")


__all__ = [
    "ScoreImportRepositorySchemaError",
    "canonical_payload",
    "encode_report_payload",
    "payload_hash",
    "validate_base_context",
]
