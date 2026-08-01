from pydantic import BaseModel, ConfigDict

from app.modules.resources.domain.resource import (
    EvidenceFragment,
    ProcessingStage,
    TeachingResource,
    TeachingResourceSensitivity,
    TeachingResourceStatus,
    TeachingResourceType,
)


class EvidenceFragmentResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    id: str
    coordinate: str
    type: str
    preview: str
    hash: str


class ProcessingStageResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    label: str
    detail: str
    status: str


class TeachingResourceResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    id: str
    name: str
    fileName: str
    course: str
    resourceType: TeachingResourceType
    version: str
    format: str
    status: TeachingResourceStatus
    size: str
    sensitivity: TeachingResourceSensitivity
    updatedAt: str
    owner: str
    hash: str
    nextAction: str
    sourceCoverage: int
    evidenceFragments: list[EvidenceFragmentResponse]
    processingStages: list[ProcessingStageResponse]
    pageCount: int | None = None
    failureReason: str | None = None

    @classmethod
    def from_domain(cls, resource: TeachingResource) -> "TeachingResourceResponse":
        return cls(
            id=resource.id,
            name=resource.name,
            fileName=resource.file_name,
            course=resource.course,
            resourceType=resource.resource_type,
            version=resource.version,
            format=resource.format,
            status=resource.status,
            size=resource.size,
            sensitivity=resource.sensitivity,
            updatedAt=resource.updated_at,
            owner=resource.owner,
            hash=resource.hash,
            nextAction=resource.next_action,
            sourceCoverage=resource.source_coverage,
            evidenceFragments=[
                EvidenceFragmentResponse(
                    id=f.id,
                    coordinate=f.coordinate,
                    type=f.type,
                    preview=f.preview,
                    hash=f.hash,
                )
                for f in resource.evidence_fragments
            ],
            processingStages=[
                ProcessingStageResponse(
                    label=s.label,
                    detail=s.detail,
                    status=s.status,
                )
                for s in resource.processing_stages
            ],
            pageCount=resource.page_count,
            failureReason=resource.failure_reason,
        )
