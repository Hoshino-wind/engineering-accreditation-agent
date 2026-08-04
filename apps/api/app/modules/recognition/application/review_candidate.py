from datetime import datetime

from app.modules.recognition.application.ports import (
    CandidateRepository,
    CandidateReviewProjection,
)
from app.modules.recognition.domain.candidate import (
    CandidateReviewStatus,
    RecognitionCandidate,
)


class ReviewCandidate:
    def __init__(
        self,
        repository: CandidateRepository,
        projection: CandidateReviewProjection | None = None,
        reviewer_name: str | None = None,
    ) -> None:
        self._repository = repository
        self._projection = projection
        self._reviewer_name = reviewer_name

    async def execute(
        self,
        candidate_id: str,
        decision: str,
        comment: str | None = None,
        source_node: str | None = None,
        target_node: str | None = None,
        relation: str | None = None,
        confidence: int | None = None,
        strength: str | None = None,
        evidence_excerpt: str | None = None,
    ) -> RecognitionCandidate | None:
        status_map = {
            "accept": CandidateReviewStatus.ACCEPTED,
            "reject": CandidateReviewStatus.REJECTED,
            "modify": CandidateReviewStatus.MODIFIED,
        }
        status = status_map.get(decision, CandidateReviewStatus.ACCEPTED)
        updated = await self._repository.update_review_status(
            candidate_id,
            status,
            reviewed_by=self._reviewer_name,
            reviewed_at=datetime.now().strftime("%Y-%m-%d %H:%M"),
            review_comment=comment.strip() if comment else None,
            source_node=source_node,
            target_node=target_node,
            relation=relation,
            confidence=confidence,
            strength=strength,
            evidence_excerpt=evidence_excerpt,
        )
        if updated is not None and self._projection is not None:
            await self._projection.apply_candidate_review(updated, status)
        return updated
