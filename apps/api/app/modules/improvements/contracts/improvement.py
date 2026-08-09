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


class UpdateImprovementStatusRequest(BaseModel):
    status: str  # open | in-progress | resolved | closed
