from typing import Literal

from pydantic import Field

from app.modules.evaluations.contracts.evaluation_read_model import (
    EvaluationReadResponse,
)
from app.modules.evaluations.domain import (
    EvaluationPreflightCheck,
    EvaluationPreflightMissingInput,
    EvaluationPreflightReport,
)


class EvaluationPreflightCheckResponse(EvaluationReadResponse):
    id: str = Field(min_length=1, max_length=160)
    label: str
    detail: str
    status: Literal["pass", "blocked"]
    owner: Literal[
        "score_input",
        "ability_graph",
        "evaluation_policy",
        "evaluation_owner",
    ]
    action: Literal[
        "none",
        "prepare_score_data",
        "repair_graph_relation",
        "review_evaluation_policy",
        "inspect_input_snapshot",
    ]

    @classmethod
    def from_check(
        cls,
        check: EvaluationPreflightCheck,
    ) -> "EvaluationPreflightCheckResponse":
        return cls(
            id=check.check_id,
            label=check.label,
            detail=check.detail,
            status=check.status,
            owner=check.owner,
            action=check.action,
        )


class EvaluationPreflightMissingInputResponse(EvaluationReadResponse):
    id: str = Field(min_length=1, max_length=160)
    label: str
    evidence_name: str

    @classmethod
    def from_missing_input(
        cls,
        missing: EvaluationPreflightMissingInput,
    ) -> "EvaluationPreflightMissingInputResponse":
        return cls(
            id=missing.input_id,
            label=missing.label,
            evidence_name=missing.evidence_name,
        )


class EvaluationPreflightResponse(EvaluationReadResponse):
    scope: Literal["pilot_snapshot"] = "pilot_snapshot"
    report_version: Literal["evaluation-preflight:v1"]
    run_id: str = Field(min_length=1, max_length=160)
    evaluation_object_id: str = Field(min_length=1, max_length=160)
    input_snapshot_hash: str
    status: Literal["ready", "blocked"]
    blockers: list[str]
    checks: list[EvaluationPreflightCheckResponse]
    missing_inputs: list[EvaluationPreflightMissingInputResponse]
    passed_check_count: int = Field(ge=0)
    blocked_check_count: int = Field(ge=0)
    report_hash: str = Field(pattern=r"^sha256:[a-f0-9]{64}$")

    @classmethod
    def from_report(
        cls,
        report: EvaluationPreflightReport,
    ) -> "EvaluationPreflightResponse":
        return cls(
            report_version=report.report_version,
            run_id=report.run_id,
            evaluation_object_id=report.evaluation_object_id,
            input_snapshot_hash=report.input_snapshot_digest,
            status=report.status,
            blockers=list(report.blockers),
            checks=[
                EvaluationPreflightCheckResponse.from_check(check)
                for check in report.checks
            ],
            missing_inputs=[
                EvaluationPreflightMissingInputResponse.from_missing_input(
                    missing
                )
                for missing in report.missing_inputs
            ],
            passed_check_count=report.passed_check_count,
            blocked_check_count=report.blocked_check_count,
            report_hash=report.report_digest,
        )


__all__ = [
    "EvaluationPreflightCheckResponse",
    "EvaluationPreflightMissingInputResponse",
    "EvaluationPreflightResponse",
]
