from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.modules.evaluations.contracts.evaluation_run_reference import (
    to_camel,
)
from app.modules.evaluations.domain import (
    AttainmentCalculation,
    EvaluatedRun,
    EvaluationInput,
    EvaluationObject,
)


class EvaluationReadResponse(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        extra="forbid",
        populate_by_name=True,
    )


class EvaluationResultResponse(EvaluationReadResponse):
    score: float = Field(ge=0, le=1)
    outcome: Literal["achieved", "not_achieved"]


class EvaluationObjectIdentityResponse(EvaluationReadResponse):
    evaluation_object_id: str = Field(min_length=1, max_length=160)
    course: str
    objective_code: str
    objective_name: str
    ability_code: str
    ability_name: str

    @classmethod
    def from_object(
        cls,
        evaluation_object: EvaluationObject,
    ) -> "EvaluationObjectIdentityResponse":
        return cls(
            evaluation_object_id=evaluation_object.evaluation_object_id,
            course=evaluation_object.course,
            objective_code=evaluation_object.objective_code,
            objective_name=evaluation_object.objective_name,
            ability_code=evaluation_object.ability_code,
            ability_name=evaluation_object.ability_name,
        )


class EvaluationObjectSummaryResponse(EvaluationObjectIdentityResponse):
    presented_run_id: str = Field(min_length=1, max_length=160)
    readiness_status: Literal["ready", "blocked"]
    approval_status: Literal[
        "not_submitted",
        "pending",
        "approved",
        "rejected",
    ]
    result: EvaluationResultResponse | None

    @classmethod
    def from_evaluated(
        cls,
        evaluated: EvaluatedRun,
    ) -> "EvaluationObjectSummaryResponse":
        result = evaluated.calculation.result
        return cls(
            **EvaluationObjectIdentityResponse.from_object(
                evaluated.evaluation_object
            ).model_dump(),
            presented_run_id=evaluated.run.run_id,
            readiness_status=(
                "ready" if evaluated.calculation.ready else "blocked"
            ),
            approval_status=evaluated.run.approval_status,
            result=(
                None
                if result is None
                else EvaluationResultResponse(
                    score=float(result.score),
                    outcome=result.outcome,
                )
            ),
        )


class EvaluationObjectListResponse(EvaluationReadResponse):
    items: list[EvaluationObjectSummaryResponse]
    total: int = Field(ge=0)


class EvaluationInputResponse(EvaluationReadResponse):
    evidence_name: str
    id: str = Field(min_length=1, max_length=160)
    label: str
    score_rate: float | None = Field(default=None, ge=0, le=1)
    weight: float = Field(ge=0, le=1)

    @classmethod
    def from_input(
        cls,
        evaluation_input: EvaluationInput,
    ) -> "EvaluationInputResponse":
        return cls(
            evidence_name=evaluation_input.evidence_name,
            id=evaluation_input.input_id,
            label=evaluation_input.label,
            score_rate=(
                None
                if evaluation_input.score_rate is None
                else float(evaluation_input.score_rate)
            ),
            weight=float(evaluation_input.weight),
        )


class EvaluationReadinessCheckResponse(EvaluationReadResponse):
    detail: str
    id: str = Field(min_length=1, max_length=160)
    label: str
    status: Literal["pass", "blocked"]


class EvaluationEvidenceReferenceResponse(EvaluationReadResponse):
    coordinate: str
    hash: str
    id: str = Field(min_length=1, max_length=160)
    name: str
    version: str


class EvaluationInputSnapshotResponse(EvaluationReadResponse):
    created_at: str
    hash: str


class AttainmentContributionResponse(EvaluationReadResponse):
    input: EvaluationInputResponse
    value: float | None


class AttainmentCalculationResponse(EvaluationReadResponse):
    blockers: list[str]
    contributions: list[AttainmentContributionResponse]
    ready: bool
    result: EvaluationResultResponse | None
    weight_total: float = Field(ge=0)

    @classmethod
    def from_calculation(
        cls,
        calculation: AttainmentCalculation,
    ) -> "AttainmentCalculationResponse":
        result = calculation.result
        return cls(
            blockers=list(calculation.blockers),
            contributions=[
                AttainmentContributionResponse(
                    input=EvaluationInputResponse.from_input(
                        contribution.evaluation_input
                    ),
                    value=(
                        None
                        if contribution.value is None
                        else float(contribution.value)
                    ),
                )
                for contribution in calculation.contributions
            ],
            ready=calculation.ready,
            result=(
                None
                if result is None
                else EvaluationResultResponse(
                    score=float(result.score),
                    outcome=result.outcome,
                )
            ),
            weight_total=float(calculation.weight_total),
        )


class EvaluationRunDetailResponse(EvaluationReadResponse):
    run_id: str = Field(min_length=1, max_length=160)
    source_run_id: str | None = Field(default=None, min_length=1, max_length=160)
    evaluation_object: EvaluationObjectIdentityResponse
    approval_status: Literal[
        "not_submitted",
        "pending",
        "approved",
        "rejected",
    ]
    graph_version: str
    policy_version: str
    program_version: str
    score_snapshot: str
    student_count: int = Field(ge=0)
    threshold: float = Field(ge=0, le=1)
    input_snapshot: EvaluationInputSnapshotResponse
    inputs: list[EvaluationInputResponse]
    readiness_checks: list[EvaluationReadinessCheckResponse]
    evidence: list[EvaluationEvidenceReferenceResponse]
    calculation: AttainmentCalculationResponse

    @classmethod
    def from_evaluated(
        cls,
        evaluated: EvaluatedRun,
    ) -> "EvaluationRunDetailResponse":
        run = evaluated.run
        return cls(
            run_id=run.run_id,
            source_run_id=evaluated.source_run_id,
            evaluation_object=EvaluationObjectIdentityResponse.from_object(
                evaluated.evaluation_object
            ),
            approval_status=run.approval_status,
            graph_version=run.graph_version,
            policy_version=run.policy_version,
            program_version=run.program_version,
            score_snapshot=run.score_snapshot,
            student_count=run.student_count,
            threshold=float(run.threshold),
            input_snapshot=EvaluationInputSnapshotResponse(
                created_at=run.input_snapshot.created_at,
                hash=run.input_snapshot.digest,
            ),
            inputs=[
                EvaluationInputResponse.from_input(item)
                for item in run.inputs
            ],
            readiness_checks=[
                EvaluationReadinessCheckResponse(
                    detail=item.detail,
                    id=item.check_id,
                    label=item.label,
                    status=item.status,
                )
                for item in run.readiness_checks
            ],
            evidence=[
                EvaluationEvidenceReferenceResponse(
                    coordinate=item.coordinate,
                    hash=item.digest,
                    id=item.evidence_id,
                    name=item.name,
                    version=item.version,
                )
                for item in run.evidence
            ],
            calculation=AttainmentCalculationResponse.from_calculation(
                evaluated.calculation
            ),
        )
