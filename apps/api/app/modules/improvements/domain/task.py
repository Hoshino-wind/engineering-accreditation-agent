from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class ImprovementPriority(StrEnum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ImprovementStatus(StrEnum):
    PLANNED = "planned"
    IN_PROGRESS = "in-progress"
    AWAITING_REEVALUATION = "awaiting-reevaluation"
    CLOSED = "closed"


@dataclass(frozen=True, slots=True)
class ImprovementTask:
    id: str
    user_id: str
    display_id: str
    source_module: str
    source_label: str
    title: str
    course: str
    target_node: str
    priority: ImprovementPriority
    status: ImprovementStatus
    owner: str
    due_at: str
    action_title: str
    action_detail: str
    verification_method: str
    created_at: str
    updated_at: str
    source_finding_id: str | None = None
    baseline: float | None = None
    target_value: float | None = None
    completion_summary: str = ""
    evidence_uri: str = ""
    reevaluation_result: float | None = None
    closed_at: str | None = None
    source_payload: dict | None = None
