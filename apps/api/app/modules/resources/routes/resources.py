from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.modules.resources.application import GetResource, ListResources
from app.modules.resources.contracts import TeachingResourceResponse


def create_resources_router(
    list_resources_use_case: Callable[[], ListResources],
    get_resource_use_case: Callable[[], GetResource],
) -> APIRouter:
    router = APIRouter(prefix="/resources", tags=["resources"])

    @router.get(
        "",
        response_model=list[TeachingResourceResponse],
        summary="获取教学资源列表",
    )
    async def list_resources(
        use_case: Annotated[ListResources, Depends(list_resources_use_case)],
        course: Annotated[str | None, Query(description="按课程筛选")] = None,
        status: Annotated[str | None, Query(description="按状态筛选")] = None,
        resource_type: Annotated[str | None, Query(description="按材料类型筛选")] = None,
    ) -> list[TeachingResourceResponse]:
        resources = await use_case.execute(
            course=course,
            status=status,
            resource_type=resource_type,
        )
        return [TeachingResourceResponse.from_domain(r) for r in resources]

    @router.get(
        "/{resource_id}",
        response_model=TeachingResourceResponse,
        summary="获取教学资源详情",
    )
    async def get_resource(
        resource_id: str,
        use_case: Annotated[GetResource, Depends(get_resource_use_case)],
    ) -> TeachingResourceResponse:
        resource = await use_case.execute(resource_id)
        if resource is None:
            raise HTTPException(status_code=404, detail="教学资源不存在")
        return TeachingResourceResponse.from_domain(resource)

    return router
