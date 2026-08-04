from app.modules.diagnostics.application.ports import (
    FindingRepository,
    ImprovementTaskProjection,
)
from app.modules.diagnostics.domain.finding import (
    DiagnosticFinding,
    FindingDecisionStatus,
)


class DecideFinding:
    def __init__(
        self,
        repository: FindingRepository,
        improvement_projection: ImprovementTaskProjection | None = None,
    ) -> None:
        self._repository = repository
        self._improvement_projection = improvement_projection

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
        status = status_map.get(decision, FindingDecisionStatus.CONFIRMED)
        updated = await self._repository.update_decision(finding_id, status)
        if (
            updated is not None
            and status == FindingDecisionStatus.CONVERTED
            and self._improvement_projection is not None
        ):
            await self._improvement_projection.upsert_from_finding(updated)
        return updated
