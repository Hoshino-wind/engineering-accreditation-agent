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
    ) -> Improvement:
        import time
        from datetime import datetime, timezone

        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
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
            status=ImprovementStatus.OPEN,
            priority=ImprovementPriority(priority),
            created_at=now,
            updated_at=now,
        )
        return await self._repository.add(improvement)
