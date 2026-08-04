from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from app.modules.improvements.domain import (
    ImprovementPriority,
    ImprovementStatus,
    ImprovementTask,
)


class ImprovementTaskResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    id: str
    displayId: str
    sourceModule: str
    sourceFindingId: str | None = None
    sourceLabel: str
    title: str
    course: str
    targetNode: str
    priority: ImprovementPriority
    status: ImprovementStatus
    owner: str
    dueAt: str
    actionTitle: str
    actionDetail: str
    verificationMethod: str
    baseline: float | None = None
    targetValue: float | None = None
    completionSummary: str
    evidenceUri: str
    reevaluationResult: float | None = None
    createdAt: str
    updatedAt: str
    closedAt: str | None = None
    sourcePayload: dict

    @classmethod
    def from_domain(cls, task: ImprovementTask) -> "ImprovementTaskResponse":
        return cls(
            id=task.id,
            displayId=task.display_id,
            sourceModule=task.source_module,
            sourceFindingId=task.source_finding_id,
            sourceLabel=task.source_label,
            title=task.title,
            course=task.course,
            targetNode=task.target_node,
            priority=task.priority,
            status=task.status,
            owner=task.owner,
            dueAt=task.due_at,
            actionTitle=task.action_title,
            actionDetail=task.action_detail,
            verificationMethod=task.verification_method,
            baseline=task.baseline,
            targetValue=task.target_value,
            completionSummary=task.completion_summary,
            evidenceUri=task.evidence_uri,
            reevaluationResult=task.reevaluation_result,
            createdAt=task.created_at,
            updatedAt=task.updated_at,
            closedAt=task.closed_at,
            sourcePayload=task.source_payload or {},
        )


class ImprovementTaskUpdateRequest(BaseModel):
    title: str | None = None
    course: str | None = None
    targetNode: str | None = None
    priority: ImprovementPriority | None = None
    status: ImprovementStatus | None = None
    owner: str | None = None
    dueAt: str | None = None
    actionTitle: str | None = None
    actionDetail: str | None = None
    verificationMethod: str | None = None
    baseline: float | None = None
    targetValue: float | None = None
    completionSummary: str | None = None
    evidenceUri: str | None = None
    reevaluationResult: float | None = None
