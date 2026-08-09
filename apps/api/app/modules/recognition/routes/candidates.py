from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.modules.recognition.application import ListCandidates, ReviewCandidate
from app.modules.recognition.contracts import (
    CandidateReviewRequest,
    RecognitionCandidateResponse,
)


def create_recognition_router(
    list_candidates_use_case: Callable[[], ListCandidates],
    review_candidate_use_case: Callable[[], ReviewCandidate],
) -> APIRouter:
    router = APIRouter(prefix="/recognition", tags=["recognition"])

    @router.get(
        "/candidates",
        response_model=list[RecognitionCandidateResponse],
        summary="获取识别候选列表",
    )
    async def list_candidates(
        use_case: Annotated[ListCandidates, Depends(list_candidates_use_case)],
        course: Annotated[str | None, Query(description="按课程筛选")] = None,
        risk: Annotated[str | None, Query(description="按风险等级筛选")] = None,
        candidate_type: Annotated[str | None, Query(description="按候选类型筛选")] = None,
        review_status: Annotated[str | None, Query(description="按审核状态筛选：pending/accepted/rejected")] = None,
    ) -> list[RecognitionCandidateResponse]:
        candidates = await use_case.execute(
            course=course,
            risk=risk,
            candidate_type=candidate_type,
            review_status=review_status,
        )
        return [RecognitionCandidateResponse.from_domain(c) for c in candidates]

    @router.post(
        "/candidates/{candidate_id}/review",
        response_model=RecognitionCandidateResponse,
        summary="审核候选关系",
    )
    async def review_candidate(
        candidate_id: str,
        body: CandidateReviewRequest,
        use_case: Annotated[ReviewCandidate, Depends(review_candidate_use_case)],
    ) -> RecognitionCandidateResponse:
        try:
            result = await use_case.execute(candidate_id, body.decision)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        if result is None:
            raise HTTPException(status_code=404, detail="候选不存在")
        return RecognitionCandidateResponse.from_domain(result)

    return router
