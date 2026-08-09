import asyncio

from app.modules.majors.application.health_overview import GetMajorHealthOverview
from app.modules.majors.domain.major import Major
from tests.test_material_health import ResourceRepository, resource


class MajorRepository:
    def __init__(self, items: list[Major]) -> None:
        self._items = items

    async def list_all(self):
        return self._items


def major(major_id: str, name: str) -> Major:
    return Major(
        id=major_id,
        code=major_id,
        name=name,
        school_name="Test University",
        standard_version="2024",
    )


def test_major_health_overview_uses_same_health_rules_and_keeps_empty_major() -> None:
    result = asyncio.run(
        GetMajorHealthOverview(
            MajorRepository([major("major-a", "A"), major("major-b", "B")]),
            ResourceRepository([resource("ready", major_id="major-a", content_hash="a")]),
        ).execute()
    )

    assert result.major_count == 2
    assert result.total_resources == 1
    assert result.total_risks == 1
    assert result.average_health_score == 50
    assert [item.major_id for item in result.majors] == ["major-b", "major-a"]
    assert result.majors[0].health_score == 0
    assert result.majors[1].health_score == 100
