from typing import Annotated

from fastapi import APIRouter, Depends

from app.modules.system.application.get_system_status import GetSystemStatus
from app.modules.system.contracts.status import SystemStatusResponse
from app.platform.config import Settings, get_settings

router = APIRouter(prefix="/system", tags=["system"])


def get_system_status_use_case(
    settings: Annotated[Settings, Depends(get_settings)],
) -> GetSystemStatus:
    return GetSystemStatus(settings)


@router.get(
    "/status",
    response_model=SystemStatusResponse,
    summary="获取系统状态",
)
async def get_system_status(
    use_case: Annotated[GetSystemStatus, Depends(get_system_status_use_case)],
) -> SystemStatusResponse:
    snapshot = await use_case.execute()
    return SystemStatusResponse.from_snapshot(snapshot)


@router.get("/live", include_in_schema=False)
async def liveness() -> dict[str, str]:
    return {"status": "ok"}
