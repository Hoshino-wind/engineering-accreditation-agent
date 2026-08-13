from app.modules.improvements.application.ports import ImprovementRepository
from app.modules.improvements.domain.improvement import (
    Improvement,
    ImprovementStatus,
)


class UpdateImprovement:
    def __init__(self, repository: ImprovementRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        improvement_id: str,
        status: str,
    ) -> Improvement | None:
        status_map = {
            "open": ImprovementStatus.OPEN,
            "in-progress": ImprovementStatus.IN_PROGRESS,
            "resolved": ImprovementStatus.RESOLVED,
            "closed": ImprovementStatus.CLOSED,
        }
        target_status = status_map.get(status, ImprovementStatus.OPEN)
        return await self._repository.update_status(improvement_id, target_status)

    async def execute_changes(
        self,
        improvement_id: str,
        changes: dict,
    ) -> Improvement | None:
        normalized = dict(changes)
        if "status" in normalized and normalized["status"] is not None:
            normalized["status"] = ImprovementStatus(str(normalized["status"]))
        return await self._repository.update(improvement_id, normalized)
