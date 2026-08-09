from dataclasses import dataclass

from app.modules.majors.application.ports import MajorRepository
from app.modules.resources.application.material_health import assess_material_health
from app.modules.resources.application.ports import ResourceRepository


@dataclass(frozen=True, slots=True)
class MajorHealthSummary:
    major_id: str
    major_name: str
    health_score: int
    total_resources: int
    risk_count: int


@dataclass(frozen=True, slots=True)
class MajorHealthOverview:
    major_count: int
    total_resources: int
    total_risks: int
    average_health_score: int
    majors: tuple[MajorHealthSummary, ...]


class GetMajorHealthOverview:
    def __init__(
        self, majors: MajorRepository, resources: ResourceRepository
    ) -> None:
        self._majors = majors
        self._resources = resources

    async def execute(self) -> MajorHealthOverview:
        majors = await self._majors.list_all()
        resources = await self._resources.list_all()
        resources_by_major: dict[str, list] = {}
        for resource in resources:
            resources_by_major.setdefault(resource.major_id, []).append(resource)

        names = {major.id: major.name for major in majors}
        major_ids = list(names)
        major_ids.extend(
            major_id for major_id in resources_by_major if major_id not in names
        )
        summaries = []
        for major_id in major_ids:
            health = assess_material_health(resources_by_major.get(major_id, []))
            summaries.append(
                MajorHealthSummary(
                    major_id=major_id,
                    major_name=names.get(major_id, "Unregistered major"),
                    health_score=health.health_score,
                    total_resources=health.total_resources,
                    risk_count=health.risk_count,
                )
            )
        summaries.sort(key=lambda item: (item.health_score, item.major_name))
        scores = [item.health_score for item in summaries]
        return MajorHealthOverview(
            major_count=len(summaries),
            total_resources=sum(item.total_resources for item in summaries),
            total_risks=sum(item.risk_count for item in summaries),
            average_health_score=round(sum(scores) / len(scores)) if scores else 100,
            majors=tuple(summaries),
        )
