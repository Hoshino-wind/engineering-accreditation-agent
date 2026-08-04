from typing import Protocol

from app.modules.recognition.domain.candidate import (
    CandidateReviewStatus,
    RecognitionCandidate,
)


class CandidateRepository(Protocol):
    async def list_all(
        self,
        *,
        course: str | None = None,
        risk: str | None = None,
        candidate_type: str | None = None,
    ) -> list[RecognitionCandidate]: ...

    async def get_by_id(self, candidate_id: str) -> RecognitionCandidate | None: ...

    async def add_many(
        self,
        candidates: list[RecognitionCandidate],
    ) -> list[RecognitionCandidate]: ...

    async def update_review_status(
        self,
        candidate_id: str,
        status: CandidateReviewStatus,
        *,
        reviewed_by: str | None = None,
        reviewed_at: str | None = None,
        review_comment: str | None = None,
        source_node: str | None = None,
        target_node: str | None = None,
        relation: str | None = None,
        confidence: int | None = None,
        strength: str | None = None,
        evidence_excerpt: str | None = None,
    ) -> RecognitionCandidate | None: ...


class CandidateReviewProjection(Protocol):
    async def apply_candidate_review(
        self,
        candidate: RecognitionCandidate,
        status: CandidateReviewStatus,
    ) -> None: ...
