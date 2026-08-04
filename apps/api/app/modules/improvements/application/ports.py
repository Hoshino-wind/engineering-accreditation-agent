from __future__ import annotations

from typing import Protocol

from app.modules.diagnostics.domain.finding import DiagnosticFinding
from app.modules.improvements.domain import ImprovementTask


class ImprovementTaskRepository(Protocol):
    async def list_all(
        self,
        *,
        status: str | None = None,
        priority: str | None = None,
    ) -> list[ImprovementTask]: ...

    async def get_by_id(self, task_id: str) -> ImprovementTask | None: ...

    async def update(
        self,
        task_id: str,
        changes: dict,
    ) -> ImprovementTask | None: ...

    async def upsert_from_finding(
        self,
        finding: DiagnosticFinding,
    ) -> ImprovementTask: ...
