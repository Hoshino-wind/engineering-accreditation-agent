from app.modules.system.application.ports import Clock, SystemRuntimeConfiguration
from app.modules.system.domain.status import (
    ComponentStatus,
    OverallStatus,
    SystemComponent,
    SystemStatusSnapshot,
)


class GetSystemStatus:
    def __init__(
        self,
        configuration: SystemRuntimeConfiguration,
        clock: Clock,
    ) -> None:
        self._configuration = configuration
        self._clock = clock

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
                is_configured=self._configuration.database_configured,
                mode=self._configuration.database_mode,
            ),
            self._configured_component(
                key="task_queue",
                name="任务队列",
                is_configured=self._configuration.task_queue_configured,
                mode=self._configuration.task_queue_mode,
            ),
            self._configured_component(
                key="object_storage",
                name="对象存储",
                is_configured=self._configuration.object_storage_configured,
                mode=self._configuration.object_storage_mode,
            ),
        )
        overall = (
            OverallStatus.OPERATIONAL
            if all(item.status != ComponentStatus.NOT_CONFIGURED for item in components)
            else OverallStatus.NEEDS_CONFIGURATION
        )
        return SystemStatusSnapshot(
            service=self._configuration.service,
            version=self._configuration.version,
            environment=self._configuration.environment,
            status=overall,
            checked_at=self._clock.now(),
            components=components,
        )

    @staticmethod
    def _configured_component(
        *,
        key: str,
        name: str,
        is_configured: bool,
        mode: str,
    ) -> SystemComponent:
        if is_configured:
            return SystemComponent(
                key=key,
                name=name,
                status=ComponentStatus.CONFIGURED,
                detail=(
                    f"{mode} 运行适配器已启用"
                    if mode == "local"
                    else "连接信息已配置；主动连通性探测将在基础设施切片启用"
                ),
            )
        return SystemComponent(
            key=key,
            name=name,
            status=ComponentStatus.NOT_CONFIGURED,
            detail="尚未配置连接信息",
        )
