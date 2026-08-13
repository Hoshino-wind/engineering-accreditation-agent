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
class SuggestedCourse:
    """AI 从材料中识别出的候选课程信息。

    上传后由 LLM 提取，作为「建议」展示给老师；老师可修改名称后确认，
    确认时才正式创建 Course 实体并回写 resource.course。
    候选阶段不落库课程，避免无谓写入与并发冲突。
    """

    name: str
    code: str = ""
    credits: float | None = None
    description: str | None = None
    confidence: float = 0.9
    source_excerpt: str | None = None


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
    # 所属专业 ID（关联 Major 实体），用于专业级隔离；默认指向 seed 专业 major-eie
    major_id: str = "major-eie"
    # 同一逻辑材料的版本链。首个版本以自身 id 作为 version_group_id，后续版本沿用。
    version_group_id: str = ""
    supersedes_id: str | None = None
    is_current_version: bool = True
    evidence_fragments: tuple[EvidenceFragment, ...] = field(default_factory=tuple)
    processing_stages: tuple[ProcessingStage, ...] = field(default_factory=tuple)
    page_count: int | None = None
    failure_reason: str | None = None
    extracted_text: str = ""
    object_key: str | None = None
    # AI 从材料中识别出的候选课程（上传后异步提取）；老师确认后才正式建课
    suggested_course: "SuggestedCourse | None" = None
