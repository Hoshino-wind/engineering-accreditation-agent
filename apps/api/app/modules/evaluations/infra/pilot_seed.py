import json
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import Any

from app.modules.evaluations.domain import (
    AttainmentCalculation,
    AttainmentContribution,
    AttainmentResult,
    EvaluationEvidenceReference,
    EvaluationInput,
    EvaluationInputSnapshot,
    EvaluationObject,
    EvaluationReadinessCheck,
    EvaluationRunReadModel,
    EvaluationRunSnapshot,
)

PILOT_SCHEMA_VERSION = 1


@dataclass(frozen=True, slots=True)
class PilotEvaluationSeed:
    objects: tuple[EvaluationObject, ...]
    runs: tuple[EvaluationRunSnapshot, ...]


def _decimal(value: object) -> Decimal:
    return Decimal(str(value))


def evaluation_object_from_payload(
    payload: dict[str, Any],
) -> EvaluationObject:
    return EvaluationObject(
        evaluation_object_id=str(payload["evaluation_object_id"]),
        display_order=int(payload["display_order"]),
        course=str(payload["course"]),
        objective_code=str(payload["objective_code"]),
        objective_name=str(payload["objective_name"]),
        ability_code=str(payload["ability_code"]),
        ability_name=str(payload["ability_name"]),
        presented_run_id=str(payload["presented_run_id"]),
    )


def evaluation_run_from_payload(
    payload: dict[str, Any],
) -> EvaluationRunReadModel:
    input_snapshot = payload["input_snapshot"]
    return EvaluationRunReadModel(
        run_id=str(payload["run_id"]),
        evaluation_object_id=str(payload["evaluation_object_id"]),
        approval_status=payload["approval_status"],
        graph_version=str(payload["graph_version"]),
        policy_version=str(payload["policy_version"]),
        program_version=str(payload["program_version"]),
        score_snapshot=str(payload["score_snapshot"]),
        student_count=int(payload["student_count"]),
        threshold=_decimal(payload["threshold"]),
        input_snapshot=EvaluationInputSnapshot(
            created_at=str(input_snapshot["created_at"]),
            digest=str(input_snapshot["digest"]),
        ),
        inputs=tuple(
            EvaluationInput(
                evidence_name=str(item["evidence_name"]),
                input_id=str(item["input_id"]),
                label=str(item["label"]),
                score_rate=(
                    None
                    if item["score_rate"] is None
                    else _decimal(item["score_rate"])
                ),
                weight=_decimal(item["weight"]),
            )
            for item in payload["inputs"]
        ),
        readiness_checks=tuple(
            EvaluationReadinessCheck(
                detail=str(item["detail"]),
                check_id=str(item["check_id"]),
                label=str(item["label"]),
                status=item["status"],
            )
            for item in payload["readiness_checks"]
        ),
        evidence=tuple(
            EvaluationEvidenceReference(
                coordinate=str(item["coordinate"]),
                digest=str(item["digest"]),
                evidence_id=str(item["evidence_id"]),
                name=str(item["name"]),
                version=str(item["version"]),
            )
            for item in payload["evidence"]
        ),
    )


def evaluation_calculation_from_payload(
    payload: dict[str, Any],
    run: EvaluationRunReadModel,
) -> AttainmentCalculation:
    inputs_by_id = {item.input_id: item for item in run.inputs}
    contributions = tuple(
        AttainmentContribution(
            evaluation_input=inputs_by_id[str(item["input_id"])],
            value=(
                None
                if item["value"] is None
                else _decimal(item["value"])
            ),
        )
        for item in payload["contributions"]
    )
    result_payload = payload["result"]
    result = (
        None
        if result_payload is None
        else AttainmentResult(
            score=_decimal(result_payload["score"]),
            outcome=result_payload["outcome"],
        )
    )
    return AttainmentCalculation(
        blockers=tuple(str(item) for item in payload["blockers"]),
        contributions=contributions,
        ready=bool(payload["ready"]),
        result=result,
        weight_total=_decimal(payload["weight_total"]),
    )


def load_pilot_evaluation_seed() -> PilotEvaluationSeed:
    seed_path = Path(__file__).with_name(
        "pilot_evaluation_read_model.json"
    )
    payload = json.loads(seed_path.read_text(encoding="utf-8"))
    if payload.get("schema_version") != PILOT_SCHEMA_VERSION:
        raise ValueError("不支持的试点评价读模型版本")
    objects = tuple(
        evaluation_object_from_payload(item)
        for item in payload["objects"]
    )
    run_models = tuple(
        evaluation_run_from_payload(item) for item in payload["runs"]
    )
    calculation_payloads = payload["calculation_snapshots"]
    run_ids = {run.run_id for run in run_models}
    if set(calculation_payloads) != run_ids:
        raise ValueError("试点评价运行与计算快照必须一一对应")
    runs = tuple(
        EvaluationRunSnapshot(
            run=run,
            calculation=evaluation_calculation_from_payload(
                calculation_payloads[run.run_id],
                run,
            ),
        )
        for run in run_models
    )
    return PilotEvaluationSeed(objects=objects, runs=runs)
