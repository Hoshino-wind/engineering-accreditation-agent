from datetime import UTC, datetime

from app.core.config import Settings
from app.modules.system.application import SystemRuntimeConfiguration


def build_system_runtime_configuration(
    settings: Settings,
) -> SystemRuntimeConfiguration:
    return SystemRuntimeConfiguration(
        service="engineering-accreditation-api",
        version=settings.app_version,
        environment=settings.environment,
        database_configured=True,
        task_queue_configured=True,
        object_storage_configured=True,
        database_mode="local",
        task_queue_mode="local",
        object_storage_mode="local",
    )


class UtcClock:
    def now(self) -> datetime:
        return datetime.now(UTC)
