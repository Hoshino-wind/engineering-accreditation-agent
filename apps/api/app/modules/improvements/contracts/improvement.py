from pydantic import BaseModel, ConfigDict

from app.modules.improvements.domain.improvement import (
    Improvement,
    ImprovementPriority,
    ImprovementStatus,
)


class ImprovementResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    id: str
    title: str
    description: str
    course: str
    majorId: str
    findingId: str | None
    targetCode: str | None
    targetName: str | None
    rootCause: str | None
    action: str
    expectedEffect: str | None
    owner: str
    deadline: str | None
    sourceModule: str
    sourceLabel: str
    verificationMethod: str
    completionSummary: str
    evidenceUri: str
    reevaluationResult: float | None
    baseline: float | None
    targetValue: float | None
    closedAt: str | None
    status: ImprovementStatus
    priority: ImprovementPriority
    createdAt: str
    updatedAt: str

    @classmethod
    def from_domain(cls, i: Improvement) -> "ImprovementResponse":
        return cls(
            id=i.id,
            title=i.title,
            description=i.description,
            course=i.course,
            majorId=i.major_id,
            findingId=i.finding_id,
            targetCode=i.target_code,
            targetName=i.target_name,
            rootCause=i.root_cause,
            action=i.action,
            expectedEffect=i.expected_effect,
            owner=i.owner,
            deadline=i.deadline,
            sourceModule=i.source_module,
            sourceLabel=i.source_label,
            verificationMethod=i.verification_method,
            completionSummary=i.completion_summary,
            evidenceUri=i.evidence_uri,
            reevaluationResult=i.reevaluation_result,
            baseline=i.baseline,
            targetValue=i.target_value,
            closedAt=i.closed_at,
            status=i.status,
            priority=i.priority,
            createdAt=i.created_at,
            updatedAt=i.updated_at,
        )


class CreateImprovementRequest(BaseModel):
    title: str
    description: str
    course: str
    action: str
    owner: str
    findingId: str | None = None
    targetCode: str | None = None
    targetName: str | None = None
    rootCause: str | None = None
    expectedEffect: str | None = None
    deadline: str | None = None
    priority: str = "medium"
    sourceModule: str = "manual"
    sourceLabel: str = ""
    verificationMethod: str = ""
    completionSummary: str = ""
    evidenceUri: str = ""
    reevaluationResult: float | None = None
    baseline: float | None = None
    targetValue: float | None = None


class UpdateImprovementStatusRequest(BaseModel):
    status: str  # open | in-progress | resolved | closed


class UpdateImprovementRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    course: str | None = None
    findingId: str | None = None
    targetCode: str | None = None
    targetName: str | None = None
    rootCause: str | None = None
    action: str | None = None
    expectedEffect: str | None = None
    owner: str | None = None
    deadline: str | None = None
    sourceModule: str | None = None
    sourceLabel: str | None = None
    verificationMethod: str | None = None
    completionSummary: str | None = None
    evidenceUri: str | None = None
    reevaluationResult: float | None = None
    baseline: float | None = None
    targetValue: float | None = None
    status: str | None = None
    priority: str | None = None
