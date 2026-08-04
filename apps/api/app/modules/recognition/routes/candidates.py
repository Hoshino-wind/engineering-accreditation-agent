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
    ) -> list[RecognitionCandidateResponse]:
        candidates = await use_case.execute(
            course=course,
            risk=risk,
            candidate_type=candidate_type,
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
        result = await use_case.execute(
            candidate_id,
            body.decision,
            body.comment,
            source_node=body.sourceNode,
            target_node=body.targetNode,
            relation=body.relation,
            confidence=body.confidence,
            strength=body.strength,
            evidence_excerpt=body.evidenceExcerpt,
        )
        if result is None:
            raise HTTPException(status_code=404, detail="候选不存在")
        return RecognitionCandidateResponse.from_domain(result)

    return router
