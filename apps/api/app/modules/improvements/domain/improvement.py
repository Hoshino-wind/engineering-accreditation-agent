from dataclasses import dataclass
from enum import StrEnum


class ImprovementStatus(StrEnum):
    OPEN = "open"
    IN_PROGRESS = "in-progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class ImprovementPriority(StrEnum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass(frozen=True, slots=True)
class Improvement:
    id: str
    title: str
    description: str
    course: str
    finding_id: str | None  # 关联的诊断发现 ID
    target_code: str | None  # 关联的毕业要求/指标点编码
    target_name: str | None
    root_cause: str | None
    action: str  # 改进措施
    expected_effect: str | None
    owner: str  # 责任人
    deadline: str | None  # ISO date string
    # 所属专业 ID（关联 Major 实体），用于专业级隔离；默认指向 seed 专业 major-eie
    major_id: str = "major-eie"
    status: ImprovementStatus = ImprovementStatus.OPEN
    priority: ImprovementPriority = ImprovementPriority.MEDIUM
    created_at: str = ""
    updated_at: str = ""
