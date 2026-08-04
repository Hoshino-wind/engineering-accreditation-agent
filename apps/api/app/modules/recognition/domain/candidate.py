from dataclasses import dataclass, field
from enum import StrEnum


class RecognitionCandidateType(StrEnum):
    RELATION = "关系候选"
    MAPPING = "映射候选"
    NODE = "节点候选"


class RecognitionCandidateRisk(StrEnum):
    HIGH_IMPACT = "highImpact"
    LOW_CONFIDENCE = "lowConfidence"
    CONFLICT = "conflict"
    NORMAL = "normal"


class CandidateReviewStatus(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    MODIFIED = "modified"


@dataclass(frozen=True, slots=True)
class CandidateEvidence:
    id: str
    resource_name: str
    resource_version: str
    coordinate: str
    excerpt: str
    hash: str


@dataclass(frozen=True, slots=True)
class RecognitionCandidate:
    id: str
    title: str
    course: str
    candidate_type: RecognitionCandidateType
    confidence: int
    risk: RecognitionCandidateRisk
    source_node: str
    relation: str
    target_node: str
    explanation: str
    processor_version: str
    generated_at: str
    review_status: CandidateReviewStatus = CandidateReviewStatus.PENDING
    impact_course_objectives: int = 0
    impact_ability_nodes: int = 0
    impact_rubric_items: int = 0
    support_strength: str | None = None
    conflict_message: str | None = None
    reviewed_by: str | None = None
    reviewed_at: str | None = None
    review_comment: str | None = None
    evidence: tuple[CandidateEvidence, ...] = field(default_factory=tuple)
