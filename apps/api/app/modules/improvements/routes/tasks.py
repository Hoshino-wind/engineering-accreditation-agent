from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.modules.improvements.application import (
    ListImprovementTasks,
    UpdateImprovementTask,
)
from app.modules.improvements.contracts import (
    ImprovementTaskResponse,
    ImprovementTaskUpdateRequest,
)


def create_improvements_router(
    list_tasks_use_case: Callable[[], ListImprovementTasks],
    update_task_use_case: Callable[[], UpdateImprovementTask],
) -> APIRouter:
    router = APIRouter(prefix="/improvements", tags=["improvements"])

    @router.get(
        "/tasks",
        response_model=list[ImprovementTaskResponse],
        summary="List teaching improvement tasks",
    )
    async def list_tasks(
        use_case: Annotated[ListImprovementTasks, Depends(list_tasks_use_case)],
        status: Annotated[str | None, Query()] = None,
        priority: Annotated[str | None, Query()] = None,
    ) -> list[ImprovementTaskResponse]:
        tasks = await use_case.execute(status=status, priority=priority)
        return [ImprovementTaskResponse.from_domain(task) for task in tasks]

    @router.patch(
        "/tasks/{task_id}",
        response_model=ImprovementTaskResponse,
        summary="Update teaching improvement task",
    )
    async def update_task(
        task_id: str,
        body: ImprovementTaskUpdateRequest,
        use_case: Annotated[UpdateImprovementTask, Depends(update_task_use_case)],
    ) -> ImprovementTaskResponse:
        result = await use_case.execute(
            task_id,
            body.model_dump(exclude_unset=True, by_alias=False),
        )
        if result is None:
            raise HTTPException(status_code=404, detail="Improvement task not found")
        return ImprovementTaskResponse.from_domain(result)

    return router
