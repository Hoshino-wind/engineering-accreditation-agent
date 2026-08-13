from app.modules.recognition.application.ports import CandidateRepository
from app.modules.recognition.domain.candidate import RecognitionCandidate


class ListCandidates:
    def __init__(
        self,
        repository: CandidateRepository,
        active_major_id: str | None = None,
    ) -> None:
        self._repository = repository
        self._active_major_id = active_major_id

    async def execute(
        self,
        *,
        course: str | None = None,
        risk: str | None = None,
        candidate_type: str | None = None,
        review_status: str | None = None,
        major_id: str | None = None,
    ) -> list[RecognitionCandidate]:
        effective_major_id = (
            major_id if major_id is not None else self._active_major_id
        )
        return await self._repository.list_all(
            course=course,
            risk=risk,
            candidate_type=candidate_type,
            review_status=review_status,
            major_id=effective_major_id,
        )
