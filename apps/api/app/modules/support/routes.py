from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.modules.support.application import GetSupportReadiness
from app.modules.support.contracts import SupportReadinessResponse


def create_support_router(get_readiness: Callable[[], GetSupportReadiness]) -> APIRouter:
    router = APIRouter(prefix="/support", tags=["support"])

    @router.get("/readiness", response_model=SupportReadinessResponse)
    async def get_support_readiness(
        use_case: Annotated[GetSupportReadiness, Depends(get_readiness)],
        course: Annotated[str | None, Query()] = None,
    ) -> SupportReadinessResponse:
        return SupportReadinessResponse.from_domain(await use_case.execute(course=course))

    return router
