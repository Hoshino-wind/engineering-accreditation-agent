from dataclasses import dataclass, replace
from datetime import datetime
from enum import StrEnum
from typing import Any


class MaterialStatus(StrEnum):
    UPLOADED = "uploaded"
    SCANNING = "scanning"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"
    QUARANTINED = "quarantined"


class StageStatus(StrEnum):
    FINISH = "finish"
    PROCESS = "process"
    WAIT = "wait"
    ERROR = "error"


@dataclass(frozen=True)
class ProcessingStage:
    label: str
    detail: str
    status: StageStatus


@dataclass(frozen=True)
class EvidenceFragment:
    id: str
    coordinate: str
    kind: str
    preview: str
    sha256: str


@dataclass(frozen=True)
class MaterialRecord:
    id: str
    file_name: str
    display_name: str
    course: str
    resource_type: str
    media_type: str
    extension: str
    size_bytes: int
    sha256: str
    status: MaterialStatus
    sensitivity: str
    created_at: datetime
    updated_at: datetime
    owner: str
    version: str
    stages: tuple[ProcessingStage, ...]
    fragments: tuple[EvidenceFragment, ...] = ()
    source_coverage: int = 0
    object_path: str | None = None
    page_count: int | None = None
    failure_reason: str | None = None

    def evolve(self, **changes: Any) -> "MaterialRecord":
        return replace(self, **changes)
