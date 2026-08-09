import hashlib
from dataclasses import dataclass
from datetime import UTC, datetime

from app.modules.improvements.application.ports import ImprovementRepository
from app.modules.improvements.domain.improvement import (
    Improvement,
    ImprovementPriority,
    ImprovementStatus,
)
from app.modules.resources.application.material_health_actions import (
    MaterialHealthAction,
    PlanMaterialHealthActions,
)
from app.modules.resources.application.ports import ResourceRepository


@dataclass(frozen=True, slots=True)
class ConfirmedMaterialHealthAction:
    improvement: Improvement
    created: bool


class MaterialHealthActionNotFoundError(ValueError):
    pass


class ConfirmMaterialHealthAction:
    def __init__(
        self,
        resources: ResourceRepository,
        improvements: ImprovementRepository,
        active_major_id: str | None = None,
    ) -> None:
        self._resources = resources
        self._improvements = improvements
        self._major_id = active_major_id or "major-eie"
        self._planner = PlanMaterialHealthActions(resources, active_major_id)

    async def execute(
        self, *, risk_code: str, resource_id: str | None
    ) -> ConfirmedMaterialHealthAction:
        action = await self._find_action(risk_code, resource_id)
        source_key = self._source_key(action)
        existing = await self._improvements.list_all(major_id=self._major_id)
        marker = f"[material-health:{source_key}]"
        for improvement in existing:
            if marker in improvement.description:
                return ConfirmedMaterialHealthAction(improvement=improvement, created=False)

        resource = (
            await self._resources.get_by_id(resource_id) if resource_id is not None else None
        )
        now = datetime.now(UTC).strftime("%Y-%m-%d %H:%M")
        improvement = Improvement(
            id=f"imp-health-{source_key[:16]}",
            title=self._title(action, resource.name if resource else None),
            description=(
                f"{marker}\nresource_id={action.resource_id or ''}\n"
                f"risk_code={action.risk_code}\n{action.action}"
            ),
            course=resource.course if resource else "Program governance",
            finding_id=None,
            target_code=None,
            target_name=None,
            root_cause=risk_code,
            action=action.action,
            expected_effect="Material health risk is closed with traceable evidence.",
            owner=action.owner_role,
            deadline=None,
            major_id=self._major_id,
            status=ImprovementStatus.OPEN,
            priority=ImprovementPriority(action.priority),
            created_at=now,
            updated_at=now,
        )
        return ConfirmedMaterialHealthAction(
            improvement=await self._improvements.add(improvement), created=True
        )

    async def _find_action(
        self, risk_code: str, resource_id: str | None
    ) -> MaterialHealthAction:
        for action in await self._planner.execute():
            if action.risk_code == risk_code and action.resource_id == resource_id:
                return action
        raise MaterialHealthActionNotFoundError("The material health action is no longer active.")

    def _source_key(self, action: MaterialHealthAction) -> str:
        source = f"{self._major_id}:{action.risk_code}:{action.resource_id or 'major'}"
        return hashlib.sha256(source.encode()).hexdigest()

    @staticmethod
    def _title(action: MaterialHealthAction, resource_name: str | None) -> str:
        subject = resource_name or "program materials"
        return f"Material health: {action.risk_code} ({subject})"
