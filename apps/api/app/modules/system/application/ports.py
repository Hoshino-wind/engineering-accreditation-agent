from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


@dataclass(frozen=True, slots=True)
class SystemRuntimeConfiguration:
    service: str
    version: str
    environment: str
    database_configured: bool
    task_queue_configured: bool
    object_storage_configured: bool


class Clock(Protocol):
    def now(self) -> datetime: ...
