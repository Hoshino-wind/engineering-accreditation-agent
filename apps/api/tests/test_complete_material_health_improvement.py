import asyncio
from dataclasses import replace

from app.modules.improvements.application.complete_material_health_improvement import (
    CompleteMaterialHealthImprovement,
)
from app.modules.improvements.domain.improvement import (
    Improvement,
    ImprovementPriority,
    ImprovementStatus,
)
from tests.test_confirm_material_health_action import ImprovementRepository, ResourceRepository
from tests.test_material_health import resource


class CompletionRepository(ImprovementRepository):
    async def get_by_id(self, improvement_id: str):
        return next((item for item in self.items if item.id == improvement_id), None)

    async def update_status(self, improvement_id: str, status):
        current = await self.get_by_id(improvement_id)
        if current is None:
            return None
        updated = replace(current, status=status)
        self.items = [updated if item.id == improvement_id else item for item in self.items]
        return updated


def improvement() -> Improvement:
    return Improvement(
        id="imp-1",
        title="Fix evidence",
        description="[material-health:x]\nresource_id=missing\nrisk_code=missing-evidence",
        course="Data Structures",
        finding_id=None,
        target_code=None,
        target_name=None,
        root_cause="missing-evidence",
        action="Register evidence",
        expected_effect=None,
        owner="evidence-steward",
        deadline=None,
        major_id="major-eie",
        status=ImprovementStatus.OPEN,
        priority=ImprovementPriority.HIGH,
        created_at="", updated_at="",
    )


def test_completion_keeps_item_open_when_risk_remains() -> None:
    repo = CompletionRepository()
    repo.items.append(improvement())
    result = asyncio.run(
        CompleteMaterialHealthImprovement(
            repo, ResourceRepository([resource("missing", evidence=False)]), "major-eie"
        ).execute("imp-1")
    )
    assert result is not None
    assert result.verified is False
    assert result.improvement.status == ImprovementStatus.IN_PROGRESS


def test_completion_closes_item_when_risk_is_resolved() -> None:
    repo = CompletionRepository()
    repo.items.append(improvement())
    result = asyncio.run(
        CompleteMaterialHealthImprovement(
            repo, ResourceRepository([resource("missing", evidence=True)]), "major-eie"
        ).execute("imp-1")
    )
    assert result is not None
    assert result.verified is True
    assert result.improvement.status == ImprovementStatus.CLOSED
