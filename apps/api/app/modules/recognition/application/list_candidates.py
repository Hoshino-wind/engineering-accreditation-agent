from app.modules.recognition.application.ports import CandidateRepository
from app.modules.recognition.domain.candidate import RecognitionCandidate


class ListCandidates:
    def __init__(self, repository: CandidateRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        *,
        course: str | None = None,
        risk: str | None = None,
        candidate_type: str | None = None,
    ) -> list[RecognitionCandidate]:
        return await self._repository.list_all(
            course=course,
            risk=risk,
            candidate_type=candidate_type,
        )
