from typing import Protocol

from app.modules.graph.domain import AbilityGraph, AbilityGraphEdge
from app.modules.recognition.domain.candidate import (
    CandidateReviewStatus,
    RecognitionCandidate,
)


class AbilityGraphRepository(Protocol):
    async def get_graph(self) -> AbilityGraph: ...

    async def review_edge(
        self,
        edge_id: str,
        decision: str,
    ) -> AbilityGraphEdge | None: ...


class CandidateReviewProjection(Protocol):
    async def apply_candidate_review(
        self,
        candidate: RecognitionCandidate,
        status: CandidateReviewStatus,
    ) -> None: ...

