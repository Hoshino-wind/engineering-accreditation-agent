from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends

from app.modules.system.application import GetSystemStatus
from app.modules.system.contracts import SystemStatusResponse


def create_system_router(
    get_system_status_use_case: Callable[[], GetSystemStatus],
) -> APIRouter:
    router = APIRouter(prefix="/system", tags=["system"])

    @router.get(
        "/status",
        response_model=SystemStatusResponse,
        summary="获取系统状态",
    )
    async def get_system_status(
        use_case: Annotated[
            GetSystemStatus,
            Depends(get_system_status_use_case),
        ],
    ) -> SystemStatusResponse:
        snapshot = await use_case.execute()
        return SystemStatusResponse.from_snapshot(snapshot)

    @router.get("/live", include_in_schema=False)
    async def liveness() -> dict[str, str]:
        return {"status": "ok"}

    return router
