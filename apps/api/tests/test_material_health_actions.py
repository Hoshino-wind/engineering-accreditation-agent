import asyncio
from dataclasses import replace

from app.modules.resources.application.material_health_actions import (
    PlanMaterialHealthActions,
)
from app.modules.resources.domain.resource import TeachingResourceStatus
from tests.test_material_health import ResourceRepository, resource


def test_health_actions_are_deterministic_and_require_human_review() -> None:
    failed = replace(
        resource("failed", status=TeachingResourceStatus.FAILED),
        failure_reason="Parser failure",
    )
    actions = asyncio.run(
        PlanMaterialHealthActions(
            ResourceRepository([resource("missing", evidence=False), failed]), "major-eie"
        ).execute()
    )

    assert [item.risk_code for item in actions] == [
        "missing-evidence",
        "duplicate-content",
        "duplicate-content",
        "resource-failed",
    ]
    assert all(item.requires_human_review for item in actions)
    assert actions[0].owner_role == "evidence-steward"
    assert actions[3].priority == "high"
