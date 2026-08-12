"""图谱派生评价来源的读端点。"""

from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.modules.evaluations.application import (
    EvaluationPolicyUnavailableError,
    GetGraphEvaluationSources,
    PublishedGraphUnavailableError,
)
from app.modules.evaluations.contracts import GraphEvaluationSourcesResponse


def create_graph_evaluation_sources_router(
    provide: Callable[[], GetGraphEvaluationSources],
) -> APIRouter:
    router = APIRouter()

    @router.get(
        "/graph-sources",
        name="get_graph_evaluation_sources",
        response_model=GraphEvaluationSourcesResponse,
        responses={409: {"description": "尚无已发布图谱版本或生效评价策略"}},
        summary="读取由正式图谱与评价策略共同决定的评价来源",
    )
    async def get_graph_evaluation_sources(
        use_case: Annotated[GetGraphEvaluationSources, Depends(provide)],
    ) -> GraphEvaluationSourcesResponse:
        try:
            view = await use_case.run()
        except PublishedGraphUnavailableError as error:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "published_graph_unavailable",
                    "message": "尚无已发布图谱版本，评价没有可用结构",
                    "owner": "M2",
                },
            ) from error
        except EvaluationPolicyUnavailableError as error:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "evaluation_policy_unavailable",
                    "message": "尚无生效评价策略版本，权重与阈值无从取得",
                    "owner": "M6",
                },
            ) from error
        return GraphEvaluationSourcesResponse.from_view(view)

    return router


__all__ = ["create_graph_evaluation_sources_router"]
