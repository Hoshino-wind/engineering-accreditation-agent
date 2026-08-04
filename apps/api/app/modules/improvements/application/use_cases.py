from __future__ import annotations

from app.modules.improvements.application.ports import ImprovementTaskRepository
from app.modules.improvements.domain import ImprovementTask


class ListImprovementTasks:
    def __init__(self, repository: ImprovementTaskRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        *,
        status: str | None = None,
        priority: str | None = None,
    ) -> list[ImprovementTask]:
        return await self._repository.list_all(status=status, priority=priority)


class UpdateImprovementTask:
    def __init__(self, repository: ImprovementTaskRepository) -> None:
        self._repository = repository

    async def execute(self, task_id: str, changes: dict) -> ImprovementTask | None:
        return await self._repository.update(task_id, changes)
