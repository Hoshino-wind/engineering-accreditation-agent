import hashlib
import json
from dataclasses import asdict, replace
from decimal import Decimal

from .evaluation_read_model import (
    EvaluationInputSnapshot,
    EvaluationRunSnapshot,
    calculate_attainment,
)


class EvaluationRunSourceNotReadyError(ValueError):
    def __init__(self, blockers: tuple[str, ...]) -> None:
        super().__init__("评价输入未就绪")
        self.blockers = blockers

def _json_ready(value: object) -> object:
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, dict):
        return {key: _json_ready(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_ready(item) for item in value]
    return value


def _input_snapshot_digest(source: EvaluationRunSnapshot) -> str:
    run = source.run
    payload = {
        "evaluation_object_id": run.evaluation_object_id,
        "evidence": [asdict(item) for item in run.evidence],
        "graph_version": run.graph_version,
        "inputs": [asdict(item) for item in run.inputs],
        "policy_version": run.policy_version,
        "readiness_checks": [
            {"check_id": item.check_id, "status": item.status}
            for item in run.readiness_checks
        ],
        "score_snapshot": run.score_snapshot,
        "student_count": run.student_count,
        "threshold": run.threshold,
    }
    canonical = json.dumps(
        _json_ready(payload),
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    return f"sha256:{hashlib.sha256(canonical.encode('utf-8')).hexdigest()}"


def create_evaluation_run_from_snapshot(
    source: EvaluationRunSnapshot,
    *,
    run_id: str,
    created_at: str,
    program_version: str,
) -> EvaluationRunSnapshot:
    if not source.calculation.ready:
        raise EvaluationRunSourceNotReadyError(source.calculation.blockers)
    run = replace(
        source.run,
        approval_status="not_submitted",
        input_snapshot=EvaluationInputSnapshot(
            created_at=created_at,
            digest=_input_snapshot_digest(source),
        ),
        program_version=program_version,
        run_id=run_id,
    )
    return EvaluationRunSnapshot(
        run=run,
        calculation=calculate_attainment(run),
    )
