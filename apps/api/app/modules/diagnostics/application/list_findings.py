from app.modules.diagnostics.application.ports import FindingRepository
from app.modules.diagnostics.domain.finding import DiagnosticFinding


class ListFindings:
    def __init__(self, repository: FindingRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        *,
        course: str | None = None,
        risk: str | None = None,
        finding_type: str | None = None,
    ) -> list[DiagnosticFinding]:
        return await self._repository.list_all(
            course=course,
            risk=risk,
            finding_type=finding_type,
        )
