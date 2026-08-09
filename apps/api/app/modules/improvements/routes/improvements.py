from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.modules.improvements.application import (
    CompleteMaterialHealthImprovement,
    CreateImprovement,
    ListImprovements,
    UpdateImprovement,
)
from app.modules.improvements.contracts import (
    CreateImprovementRequest,
    ImprovementCompletionResponse,
    ImprovementResponse,
    UpdateImprovementStatusRequest,
)


def create_improvements_router(
    list_improvements_use_case: Callable[[], ListImprovements],
    create_improvement_use_case: Callable[[], CreateImprovement],
    update_improvement_use_case: Callable[[], UpdateImprovement],
    complete_improvement_use_case: Callable[[], CompleteMaterialHealthImprovement],
) -> APIRouter:
    router = APIRouter(prefix="/improvements", tags=["improvements"])

    @router.get(
        "",
        response_model=list[ImprovementResponse],
        summary="获取改进措施列表",
    )
    async def list_improvements(
        use_case: Annotated[ListImprovements, Depends(list_improvements_use_case)],
        course: Annotated[str | None, Query(description="按课程筛选")] = None,
        status: Annotated[str | None, Query(description="按状态筛选")] = None,
    ) -> list[ImprovementResponse]:
        improvements = await use_case.execute(course=course, status=status)
        return [ImprovementResponse.from_domain(i) for i in improvements]

    @router.post(
        "",
        response_model=ImprovementResponse,
        summary="创建改进措施",
    )
    async def create_improvement(
        body: CreateImprovementRequest,
        use_case: Annotated[CreateImprovement, Depends(create_improvement_use_case)],
    ) -> ImprovementResponse:
        improvement = await use_case.execute(
            title=body.title,
            description=body.description,
            course=body.course,
            action=body.action,
            owner=body.owner,
            finding_id=body.findingId,
            target_code=body.targetCode,
            target_name=body.targetName,
            root_cause=body.rootCause,
            expected_effect=body.expectedEffect,
            deadline=body.deadline,
            priority=body.priority,
        )
        return ImprovementResponse.from_domain(improvement)

    @router.patch(
        "/{improvement_id}/status",
        response_model=ImprovementResponse,
        summary="更新改进措施状态",
    )
    async def update_improvement_status(
        improvement_id: str,
        body: UpdateImprovementStatusRequest,
        use_case: Annotated[UpdateImprovement, Depends(update_improvement_use_case)],
    ) -> ImprovementResponse:
        result = await use_case.execute(improvement_id, body.status)
        if result is None:
            raise HTTPException(status_code=404, detail="改进措施不存在")
        return ImprovementResponse.from_domain(result)

    @router.post(
        "/{improvement_id}/complete", response_model=ImprovementCompletionResponse
    )
    async def complete_improvement(
        improvement_id: str,
        use_case: Annotated[
            CompleteMaterialHealthImprovement, Depends(complete_improvement_use_case)
        ],
    ) -> ImprovementCompletionResponse:
        result = await use_case.execute(improvement_id)
        if result is None:
            raise HTTPException(status_code=404, detail="Improvement not found")
        return ImprovementCompletionResponse.from_domain(result)

    return router
