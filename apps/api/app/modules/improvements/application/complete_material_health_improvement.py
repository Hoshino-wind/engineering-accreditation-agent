from dataclasses import dataclass

from app.modules.improvements.application.ports import ImprovementRepository
from app.modules.improvements.domain.improvement import Improvement, ImprovementStatus
from app.modules.resources.application.material_health_actions import PlanMaterialHealthActions
from app.modules.resources.application.ports import ResourceRepository


@dataclass(frozen=True, slots=True)
class ImprovementCompletion:
    improvement: Improvement
    verified: bool
    message: str


class CompleteMaterialHealthImprovement:
    def __init__(
        self,
        improvements: ImprovementRepository,
        resources: ResourceRepository,
        active_major_id: str | None = None,
    ) -> None:
        self._improvements = improvements
        self._planner = PlanMaterialHealthActions(resources, active_major_id)

    async def execute(self, improvement_id: str) -> ImprovementCompletion | None:
        improvement = await self._improvements.get_by_id(improvement_id)
        if improvement is None:
            return None
        risk_code, resource_id = self._source(improvement.description)
        if risk_code is None:
            closed = await self._improvements.update_status(
                improvement_id, ImprovementStatus.CLOSED
            )
            return ImprovementCompletion(closed or improvement, True, "Improvement closed.")

        unresolved = any(
            action.risk_code == risk_code and action.resource_id == resource_id
            for action in await self._planner.execute()
        )
        if unresolved:
            updated = await self._improvements.update_status(
                improvement_id, ImprovementStatus.IN_PROGRESS
            )
            return ImprovementCompletion(
                updated or improvement,
                False,
                "Risk remains active. Add evidence or resolve the material issue before closing.",
            )
        closed = await self._improvements.update_status(
            improvement_id, ImprovementStatus.CLOSED
        )
        return ImprovementCompletion(
            closed or improvement, True, "Risk recheck passed and improvement closed."
        )

    @staticmethod
    def _source(description: str) -> tuple[str | None, str | None]:
        if "[material-health:" not in description:
            return None, None
        values = {}
        for line in description.splitlines():
            if "=" in line:
                key, value = line.split("=", 1)
                values[key] = value
        return values.get("risk_code"), values.get("resource_id") or None
