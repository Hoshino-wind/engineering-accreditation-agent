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

    async def update_review_status(
        self,
        candidate_id: str,
        status: CandidateReviewStatus,
    ) -> RecognitionCandidate | None: ...

    async def delete_by_course(self, course_name: str) -> int: ...

    async def delete_by_source_nodes(self, source_node_ids: set[str]) -> int: ...
