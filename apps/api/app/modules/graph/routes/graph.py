from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.modules.graph.application import GetAbilityGraph, ReviewGraphEdge
from app.modules.graph.contracts import (
    AbilityGraphEdgeResponse,
    AbilityGraphResponse,
    GraphEdgeReviewRequest,
)


def create_graph_router(
    get_graph_use_case: Callable[[], GetAbilityGraph],
    review_edge_use_case: Callable[[], ReviewGraphEdge],
) -> APIRouter:
    router = APIRouter(prefix="/graph", tags=["graph"])

    @router.get("", response_model=AbilityGraphResponse, summary="Get ability graph")
    async def get_graph(
        use_case: Annotated[GetAbilityGraph, Depends(get_graph_use_case)],
    ) -> AbilityGraphResponse:
        graph = await use_case.execute()
        return AbilityGraphResponse.from_domain(graph)

    @router.post(
        "/edges/{edge_id}/review",
        response_model=AbilityGraphEdgeResponse,
        summary="Review graph edge",
    )
    async def review_edge(
        edge_id: str,
        body: GraphEdgeReviewRequest,
        use_case: Annotated[ReviewGraphEdge, Depends(review_edge_use_case)],
    ) -> AbilityGraphEdgeResponse:
        edge = await use_case.execute(edge_id, body.decision)
        if edge is None:
            raise HTTPException(status_code=404, detail="Graph edge not found")
        return AbilityGraphEdgeResponse.from_domain(edge)

    return router

