from collections import Counter
from dataclasses import dataclass
from enum import StrEnum

from app.modules.resources.application.ports import ResourceRepository
from app.modules.resources.domain.resource import TeachingResourceStatus


class MaterialHealthSeverity(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass(frozen=True, slots=True)
class MaterialHealthRisk:
    code: str
    severity: MaterialHealthSeverity
    message: str
    resource_id: str | None = None


@dataclass(frozen=True, slots=True)
class MaterialHealth:
    health_score: int
    total_resources: int
    ready_count: int
    processing_count: int
    failed_count: int
    quarantined_count: int
    risk_count: int
    risks: tuple[MaterialHealthRisk, ...]


class GetMaterialHealth:
    def __init__(
        self, repository: ResourceRepository, active_major_id: str | None = None
    ) -> None:
        self._repository = repository
        self._active_major_id = active_major_id

    async def execute(self) -> MaterialHealth:
        resources = await self._repository.list_all(major_id=self._active_major_id)
        return assess_material_health(resources)


def assess_material_health(resources: list) -> MaterialHealth:
        status_counts = Counter(resource.status for resource in resources)
        risks: list[MaterialHealthRisk] = []

        if not resources:
            risks.append(
                MaterialHealthRisk(
                    code="no-materials",
                    severity=MaterialHealthSeverity.CRITICAL,
                    message="No teaching materials are available for the active major.",
                )
            )

        hashes = Counter(resource.hash for resource in resources if resource.hash)
        for resource in resources:
            if not resource.evidence_fragments:
                risks.append(
                    MaterialHealthRisk(
                        code="missing-evidence",
                        severity=MaterialHealthSeverity.HIGH,
                        message="The material has no traceable evidence fragment.",
                        resource_id=resource.id,
                    )
                )
            if hashes[resource.hash] > 1:
                risks.append(
                    MaterialHealthRisk(
                        code="duplicate-content",
                        severity=MaterialHealthSeverity.MEDIUM,
                        message="Another material in the active major has the same content hash.",
                        resource_id=resource.id,
                    )
                )
            if resource.status in {
                TeachingResourceStatus.FAILED,
                TeachingResourceStatus.QUARANTINED,
            }:
                risks.append(
                    MaterialHealthRisk(
                        code=f"resource-{resource.status}",
                        severity=MaterialHealthSeverity.HIGH,
                        message=(
                            resource.failure_reason
                            or "Material processing requires attention."
                        ),
                        resource_id=resource.id,
                    )
                )
            elif resource.status in {
                TeachingResourceStatus.PROCESSING,
                TeachingResourceStatus.AWAITING_CLASSIFICATION,
            }:
                risks.append(
                    MaterialHealthRisk(
                        code=f"resource-{resource.status}",
                        severity=MaterialHealthSeverity.LOW,
                        message="Material processing is not complete.",
                        resource_id=resource.id,
                    )
                )

        penalties = {
            MaterialHealthSeverity.CRITICAL: 100,
            MaterialHealthSeverity.HIGH: 25,
            MaterialHealthSeverity.MEDIUM: 10,
            MaterialHealthSeverity.LOW: 5,
        }
        score = max(0, 100 - sum(penalties[risk.severity] for risk in risks))
        return MaterialHealth(
            health_score=score,
            total_resources=len(resources),
            ready_count=status_counts[TeachingResourceStatus.READY],
            processing_count=status_counts[TeachingResourceStatus.PROCESSING],
            failed_count=status_counts[TeachingResourceStatus.FAILED],
            quarantined_count=status_counts[TeachingResourceStatus.QUARANTINED],
            risk_count=len(risks),
            risks=tuple(risks),
        )
