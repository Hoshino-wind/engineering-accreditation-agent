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
        database_configured=settings.database_url is not None,
        task_queue_configured=settings.redis_url is not None,
        object_storage_configured=settings.object_storage_endpoint is not None,
    )


class UtcClock:
    def now(self) -> datetime:
        return datetime.now(UTC)
