from pydantic import BaseModel, ConfigDict

from app.modules.resources.domain.resource import (
    EvidenceFragment,
    ProcessingStage,
    SuggestedCourse,
    TeachingResource,
    TeachingResourceSensitivity,
    TeachingResourceStatus,
    TeachingResourceType,
)

# 与 TeachingResourceType 对齐的 7 类 + 其他；用于分类结果校验与上传参数校验
RESOURCE_CATEGORIES: tuple[str, ...] = (
    "培养方案",
    "课程大纲",
    "实验指导书",
    "实验项目清单",
    "评分表",
    "学生报告",
    "评价结果",
    "其他",
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


class SuggestedCourseResponse(BaseModel):
    """AI 识别出的候选课程信息（老师可修改名称后确认）。"""

    name: str
    code: str = ""
    credits: float | None = None
    description: str | None = None
    confidence: float = 0.9
    source_excerpt: str | None = None

    @classmethod
    def from_domain(cls, suggested: SuggestedCourse | None) -> "SuggestedCourseResponse | None":
        if suggested is None:
            return None
        return cls(
            name=suggested.name,
            code=suggested.code,
            credits=suggested.credits,
            description=suggested.description,
            confidence=suggested.confidence,
            source_excerpt=suggested.source_excerpt,
        )


class ConfirmCourseRequest(BaseModel):
    """确认候选课程入参：name 必填（用户可修改），其余选填。"""

    name: str
    code: str | None = None
    credits: float | None = None
    semester: str | None = None
    description: str | None = None


class ConfirmCourseResponse(BaseModel):
    """确认结果：返回新建（或复用）的课程 id 与名称。"""

    resourceId: str
    courseId: str
    courseName: str


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
    majorId: str
    evidenceFragments: list[EvidenceFragmentResponse]
    processingStages: list[ProcessingStageResponse]
    pageCount: int | None = None
    failureReason: str | None = None
    suggestedCourse: SuggestedCourseResponse | None = None

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
            majorId=resource.major_id,
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
            suggestedCourse=SuggestedCourseResponse.from_domain(resource.suggested_course),
        )
