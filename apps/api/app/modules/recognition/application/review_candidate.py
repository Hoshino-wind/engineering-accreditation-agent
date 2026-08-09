from app.modules.recognition.application.ports import CandidateRepository
from app.modules.recognition.domain.candidate import (
    CandidateReviewStatus,
    RecognitionCandidate,
)


class ReviewCandidate:
    def __init__(self, repository: CandidateRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        candidate_id: str,
        decision: str,
    ) -> RecognitionCandidate | None:
        status_map = {
            "accept": CandidateReviewStatus.ACCEPTED,
            "reject": CandidateReviewStatus.REJECTED,
            "modify": CandidateReviewStatus.MODIFIED,
        }
        status = status_map.get(decision)
        if status is None:
            raise ValueError(
                f"无效的审核决策: {decision!r}（可选值: accept / reject / modify）"
            )
        return await self._repository.update_review_status(candidate_id, status)
