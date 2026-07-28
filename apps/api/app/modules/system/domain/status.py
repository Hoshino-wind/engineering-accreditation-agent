from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum


class ComponentStatus(StrEnum):
    OPERATIONAL = "operational"
    CONFIGURED = "configured"
    NOT_CONFIGURED = "not_configured"


class OverallStatus(StrEnum):
    OPERATIONAL = "operational"
    NEEDS_CONFIGURATION = "needs_configuration"


@dataclass(frozen=True, slots=True)
class SystemComponent:
    key: str
    name: str
    status: ComponentStatus
    detail: str


@dataclass(frozen=True, slots=True)
class SystemStatusSnapshot:
    service: str
    version: str
    environment: str
    status: OverallStatus
    checked_at: datetime
    components: tuple[SystemComponent, ...]
