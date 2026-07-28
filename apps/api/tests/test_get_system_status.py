import asyncio
from datetime import UTC, datetime

from app.modules.system.application import (
    GetSystemStatus,
    SystemRuntimeConfiguration,
)

CHECKED_AT = datetime(2026, 7, 28, 8, 0, tzinfo=UTC)


class FixedClock:
    def now(self) -> datetime:
        return CHECKED_AT


def test_system_status_uses_application_ports() -> None:
    use_case = GetSystemStatus(
        configuration=SystemRuntimeConfiguration(
            service="test-api",
            version="1.2.3",
            environment="test",
            database_configured=True,
            task_queue_configured=False,
            object_storage_configured=True,
        ),
        clock=FixedClock(),
    )

    snapshot = asyncio.run(use_case.execute())

    assert snapshot.service == "test-api"
    assert snapshot.checked_at == CHECKED_AT
    assert [component.status for component in snapshot.components] == [
        "operational",
        "configured",
        "not_configured",
        "configured",
    ]
