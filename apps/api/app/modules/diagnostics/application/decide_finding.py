from app.modules.diagnostics.application.ports import FindingRepository
from app.modules.diagnostics.domain.finding import (
    DiagnosticFinding,
    FindingDecisionStatus,
)


class DecideFinding:
    def __init__(self, repository: FindingRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        finding_id: str,
        decision: str,
    ) -> DiagnosticFinding | None:
        status_map = {
            "confirm": FindingDecisionStatus.CONFIRMED,
            "dismiss": FindingDecisionStatus.DISMISSED,
            "convert": FindingDecisionStatus.CONVERTED,
        }
        status = status_map.get(decision)
        if status is None:
            raise ValueError(
                f"无效的处置决策: {decision!r}（可选值: confirm / dismiss / convert）"
            )
        return await self._repository.update_decision(finding_id, status)
