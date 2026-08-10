from datetime import UTC

from app.modules.improvements.application.ports import ImprovementRepository
from app.modules.improvements.domain.improvement import (
    Improvement,
    ImprovementPriority,
    ImprovementStatus,
)


class CreateImprovement:
    def __init__(self, repository: ImprovementRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        *,
        title: str,
        description: str,
        course: str,
        action: str,
        owner: str,
        finding_id: str | None = None,
        target_code: str | None = None,
        target_name: str | None = None,
        root_cause: str | None = None,
        expected_effect: str | None = None,
        deadline: str | None = None,
        priority: str = "medium",
        source_module: str = "manual",
        source_label: str = "",
        verification_method: str = "",
        completion_summary: str = "",
        evidence_uri: str = "",
        reevaluation_result: float | None = None,
        baseline: float | None = None,
        target_value: float | None = None,
        major_id: str = "major-eie",
    ) -> Improvement:
        import time
        from datetime import datetime

        now = datetime.now(UTC).strftime("%Y-%m-%d %H:%M")
        improvement = Improvement(
            id=f"imp-{int(time.time() * 1000) % 100000000}",
            title=title,
            description=description,
            course=course,
            finding_id=finding_id,
            target_code=target_code,
            target_name=target_name,
            root_cause=root_cause,
            action=action,
            expected_effect=expected_effect,
            owner=owner,
            deadline=deadline,
            source_module=source_module,
            source_label=source_label,
            verification_method=verification_method,
            completion_summary=completion_summary,
            evidence_uri=evidence_uri,
            reevaluation_result=reevaluation_result,
            baseline=baseline,
            target_value=target_value,
            major_id=major_id,
            status=ImprovementStatus.OPEN,
            priority=ImprovementPriority(priority),
            created_at=now,
            updated_at=now,
        )
        return await self._repository.add(improvement)
