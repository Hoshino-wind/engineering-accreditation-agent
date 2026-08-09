import asyncio

from app.modules.resources.application.confirm_material_health_action import (
    ConfirmMaterialHealthAction,
    MaterialHealthActionNotFoundError,
)
from tests.test_material_health import ResourceRepository as BaseResourceRepository
from tests.test_material_health import resource


class ResourceRepository(BaseResourceRepository):
    async def get_by_id(self, resource_id: str):
        return next((item for item in self._items if item.id == resource_id), None)


class ImprovementRepository:
    def __init__(self) -> None:
        self.items = []

    async def list_all(self, **_kwargs):
        return self.items

    async def add(self, improvement):
        self.items.append(improvement)
        return improvement


def test_confirming_action_creates_one_traceable_improvement() -> None:
    improvements = ImprovementRepository()
    use_case = ConfirmMaterialHealthAction(
        ResourceRepository([resource("missing", evidence=False)]),
        improvements,
        "major-eie",
    )

    first = asyncio.run(
        use_case.execute(risk_code="missing-evidence", resource_id="missing")
    )
    second = asyncio.run(
        use_case.execute(risk_code="missing-evidence", resource_id="missing")
    )

    assert first.created is True
    assert second.created is False
    assert len(improvements.items) == 1
    assert improvements.items[0].major_id == "major-eie"
    assert "[material-health:" in improvements.items[0].description


def test_confirming_inactive_action_is_rejected() -> None:
    use_case = ConfirmMaterialHealthAction(
        ResourceRepository([resource("healthy")]), ImprovementRepository(), "major-eie"
    )

    try:
        asyncio.run(use_case.execute(risk_code="missing-evidence", resource_id="healthy"))
    except MaterialHealthActionNotFoundError:
        pass
    else:
        raise AssertionError("expected inactive health action to be rejected")
