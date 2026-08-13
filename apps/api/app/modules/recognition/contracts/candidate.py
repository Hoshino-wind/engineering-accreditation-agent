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
    resourceId: str = ""


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
    majorId: str
    reviewStatus: CandidateReviewStatus
    impact: dict[str, int]
    conflictMessage: str | None = None
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
            majorId=c.major_id,
            reviewStatus=c.review_status,
            impact={
                "courseObjectives": c.impact_course_objectives,
                "abilityNodes": c.impact_ability_nodes,
                "rubricItems": c.impact_rubric_items,
            },
            conflictMessage=c.conflict_message,
            evidence=[
                CandidateEvidenceResponse(
                    id=e.id,
                    resourceName=e.resource_name,
                    resourceVersion=e.resource_version,
                    coordinate=e.coordinate,
                    excerpt=e.excerpt,
                    hash=e.hash,
                    resourceId=e.resource_id,
                )
                for e in c.evidence
            ],
        )


class CandidateReviewRequest(BaseModel):
    decision: str  # accept | reject | modify
