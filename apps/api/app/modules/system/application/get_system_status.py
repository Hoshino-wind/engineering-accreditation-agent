from datetime import UTC, datetime

from app.modules.system.domain.status import (
    ComponentStatus,
    OverallStatus,
    SystemComponent,
    SystemStatusSnapshot,
)
from app.platform.config import Settings


class GetSystemStatus:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def execute(self) -> SystemStatusSnapshot:
        components = (
            SystemComponent(
                key="api",
                name="API 服务",
                status=ComponentStatus.OPERATIONAL,
                detail="FastAPI 请求服务可用",
            ),
            self._configured_component(
                key="database",
                name="数据库",
                value=self._settings.database_url,
            ),
            self._configured_component(
                key="task_queue",
                name="任务队列",
                value=self._settings.redis_url,
            ),
            self._configured_component(
                key="object_storage",
                name="对象存储",
                value=self._settings.object_storage_endpoint,
            ),
        )
        overall = (
            OverallStatus.OPERATIONAL
            if all(item.status != ComponentStatus.NOT_CONFIGURED for item in components)
            else OverallStatus.NEEDS_CONFIGURATION
        )
        return SystemStatusSnapshot(
            service="engineering-accreditation-api",
            version=self._settings.app_version,
            environment=self._settings.environment,
            status=overall,
            checked_at=datetime.now(UTC),
            components=components,
        )

    @staticmethod
    def _configured_component(
        *,
        key: str,
        name: str,
        value: str | None,
    ) -> SystemComponent:
        if value:
            return SystemComponent(
                key=key,
                name=name,
                status=ComponentStatus.CONFIGURED,
                detail="连接信息已配置；主动连通性探测将在基础设施切片启用",
            )
        return SystemComponent(
            key=key,
            name=name,
            status=ComponentStatus.NOT_CONFIGURED,
            detail="尚未配置连接信息",
        )
