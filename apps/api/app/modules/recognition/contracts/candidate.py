from pydantic import BaseModel, ConfigDict

from app.modules.recognition.domain.candidate import (
    CandidateReviewStatus,
    RecognitionCandidate,
    RecognitionCandidateRisk,
    RecognitionCandidateType,
)


class CandidateEvidenceResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    id: str
    resourceName: str
    resourceVersion: str
    coordinate: str
    excerpt: str
    hash: str


class RecognitionCandidateResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    id: str
    title: str
    course: str
    candidateType: RecognitionCandidateType
    confidence: int
    risk: RecognitionCandidateRisk
    sourceNode: str
    relation: str
    targetNode: str
    explanation: str
    processorVersion: str
    generatedAt: str
    reviewStatus: CandidateReviewStatus
    impact: dict[str, int]
    supportStrength: str | None = None
    conflictMessage: str | None = None
    reviewedBy: str | None = None
    reviewedAt: str | None = None
    reviewComment: str | None = None
    evidence: list[CandidateEvidenceResponse]

    @classmethod
    def from_domain(cls, c: RecognitionCandidate) -> "RecognitionCandidateResponse":
        return cls(
            id=c.id,
            title=c.title,
            course=c.course,
            candidateType=c.candidate_type,
            confidence=c.confidence,
            risk=c.risk,
            sourceNode=c.source_node,
            relation=c.relation,
            targetNode=c.target_node,
            explanation=c.explanation,
            processorVersion=c.processor_version,
            generatedAt=c.generated_at,
            reviewStatus=c.review_status,
            impact={
                "courseObjectives": c.impact_course_objectives,
                "abilityNodes": c.impact_ability_nodes,
                "rubricItems": c.impact_rubric_items,
            },
            supportStrength=c.support_strength,
            conflictMessage=c.conflict_message,
            reviewedBy=c.reviewed_by,
            reviewedAt=c.reviewed_at,
            reviewComment=c.review_comment,
            evidence=[
                CandidateEvidenceResponse(
                    id=e.id,
                    resourceName=e.resource_name,
                    resourceVersion=e.resource_version,
                    coordinate=e.coordinate,
                    excerpt=e.excerpt,
                    hash=e.hash,
                )
                for e in c.evidence
            ],
        )


class CandidateReviewRequest(BaseModel):
    decision: str  # accept | reject | modify
    comment: str | None = None
    sourceNode: str | None = None
    targetNode: str | None = None
    relation: str | None = None
    confidence: int | None = None
    strength: str | None = None
    evidenceExcerpt: str | None = None
