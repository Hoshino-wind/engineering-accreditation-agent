from dataclasses import dataclass, field
from enum import StrEnum


class TeachingResourceStatus(StrEnum):
    READY = "ready"
    PROCESSING = "processing"
    AWAITING_CLASSIFICATION = "awaitingClassification"
    FAILED = "failed"
    QUARANTINED = "quarantined"


class TeachingResourceType(StrEnum):
    SYLLABUS = "课程大纲"
    LAB_GUIDE = "实验指导书"
    PROJECT_LIST = "实验项目清单"
    RUBRIC = "评分表"
    STUDENT_REPORT = "学生报告"
    EVALUATION_RESULT = "评价结果"
    IMPROVEMENT_RECORD = "改进记录"


class TeachingResourceSensitivity(StrEnum):
    INTERNAL = "internal"
    RESTRICTED = "restricted"


@dataclass(frozen=True, slots=True)
class EvidenceFragment:
    id: str
    coordinate: str
    type: str
    preview: str
    hash: str


@dataclass(frozen=True, slots=True)
class ProcessingStage:
    label: str
    detail: str
    status: str


@dataclass(frozen=True, slots=True)
class TeachingResource:
    id: str
    name: str
    file_name: str
    course: str
    resource_type: TeachingResourceType
    version: str
    format: str
    status: TeachingResourceStatus
    size: str
    sensitivity: TeachingResourceSensitivity
    updated_at: str
    owner: str
    hash: str
    next_action: str
    source_coverage: int
    evidence_fragments: tuple[EvidenceFragment, ...] = field(default_factory=tuple)
    processing_stages: tuple[ProcessingStage, ...] = field(default_factory=tuple)
    page_count: int | None = None
    failure_reason: str | None = None
