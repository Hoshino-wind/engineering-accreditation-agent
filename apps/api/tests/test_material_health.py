import asyncio
from dataclasses import replace

from app.modules.resources.application.material_health import GetMaterialHealth
from app.modules.resources.domain.resource import (
    EvidenceFragment,
    TeachingResource,
    TeachingResourceSensitivity,
    TeachingResourceStatus,
    TeachingResourceType,
)


class ResourceRepository:
    def __init__(self, items: list[TeachingResource]) -> None:
        self._items = items

    async def list_all(self, *, major_id: str | None = None, **_kwargs):
        if major_id is None:
            return self._items
        return [item for item in self._items if item.major_id == major_id]


def resource(
    resource_id: str,
    *,
    major_id: str = "major-eie",
    status: TeachingResourceStatus = TeachingResourceStatus.READY,
    content_hash: str = "hash-1",
    evidence: bool = True,
) -> TeachingResource:
    return TeachingResource(
        id=resource_id,
        name=resource_id,
        file_name=f"{resource_id}.pdf",
        course="Data Structures",
        resource_type=TeachingResourceType.SYLLABUS,
        version="v1",
        format="PDF",
        status=status,
        size="1 KB",
        sensitivity=TeachingResourceSensitivity.INTERNAL,
        updated_at="2026-08-09 00:00",
        owner="test-user",
        hash=content_hash,
        next_action="",
        source_coverage=0,
        major_id=major_id,
        evidence_fragments=(
            EvidenceFragment(
                id=f"evidence-{resource_id}",
                coordinate="file",
                type="source-file",
                preview=resource_id,
                hash=content_hash,
            ),
        )
        if evidence
        else (),
    )


def test_no_materials_is_critical() -> None:
    result = asyncio.run(GetMaterialHealth(ResourceRepository([]), "major-eie").execute())

    assert result.health_score == 0
    assert result.risks[0].code == "no-materials"


def test_health_reports_missing_evidence_duplicates_and_failed_items() -> None:
    failed = replace(
        resource("failed", status=TeachingResourceStatus.FAILED, content_hash="same"),
        failure_reason="Parser failed",
    )
    result = asyncio.run(
        GetMaterialHealth(
            ResourceRepository(
                [resource("missing", evidence=False, content_hash="same"), failed]
            ),
            "major-eie",
        ).execute()
    )

    assert result.failed_count == 1
    assert result.risk_count == 4
    assert {risk.code for risk in result.risks} == {
        "missing-evidence",
        "duplicate-content",
        "resource-failed",
    }
    assert result.health_score == 30


def test_health_is_scoped_to_active_major() -> None:
    result = asyncio.run(
        GetMaterialHealth(
            ResourceRepository(
                [
                    resource("healthy", content_hash="first"),
                    resource("other", major_id="major-other", evidence=False),
                ]
            ),
            "major-eie",
        ).execute()
    )

    assert result.total_resources == 1
    assert result.health_score == 100
