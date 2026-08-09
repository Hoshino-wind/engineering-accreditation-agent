from dataclasses import dataclass

from app.modules.resources.application.material_health import (
    GetMaterialHealth,
    MaterialHealthSeverity,
)
from app.modules.resources.application.ports import ResourceRepository


@dataclass(frozen=True, slots=True)
class MaterialHealthAction:
    risk_code: str
    resource_id: str | None
    priority: str
    owner_role: str
    action: str
    requires_human_review: bool = True


class PlanMaterialHealthActions:
    def __init__(
        self, repository: ResourceRepository, active_major_id: str | None = None
    ) -> None:
        self._health = GetMaterialHealth(repository, active_major_id)

    async def execute(self) -> tuple[MaterialHealthAction, ...]:
        health = await self._health.execute()
        actions = []
        for risk in health.risks:
            actions.append(
                MaterialHealthAction(
                    risk_code=risk.code,
                    resource_id=risk.resource_id,
                    priority=self._priority(risk.severity),
                    owner_role=self._owner_role(risk.code),
                    action=self._action(risk.code),
                )
            )
        return tuple(actions)

    @staticmethod
    def _priority(severity: MaterialHealthSeverity) -> str:
        if severity in {MaterialHealthSeverity.CRITICAL, MaterialHealthSeverity.HIGH}:
            return "high"
        if severity == MaterialHealthSeverity.MEDIUM:
            return "medium"
        return "low"

    @staticmethod
    def _owner_role(code: str) -> str:
        if code in {"missing-evidence", "no-materials"}:
            return "evidence-steward"
        if code == "duplicate-content":
            return "course-owner"
        return "materials-administrator"

    @staticmethod
    def _action(code: str) -> str:
        actions = {
            "no-materials": "Import the minimum evidence material set for this major.",
            "missing-evidence": "Register a traceable evidence fragment for this material.",
            "duplicate-content": "Review duplicate content and retain the authoritative version.",
            "resource-failed": "Resolve the processing failure and re-run material extraction.",
            "resource-quarantined": "Complete the security review before releasing this material.",
            "resource-processing": (
                "Monitor processing completion before using this material in evaluation."
            ),
            "resource-awaitingClassification": "Confirm the course and material classification.",
        }
        return actions.get(code, "Review the material health risk and decide a corrective action.")
