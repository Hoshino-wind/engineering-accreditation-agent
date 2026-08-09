from app.modules.diagnostics.application.ports import FindingRepository
from app.modules.diagnostics.domain.finding import DiagnosticFinding


class ListFindings:
    def __init__(
        self, repository: FindingRepository, active_major_id: str | None = None
    ) -> None:
        self._repository = repository
        self._active_major_id = active_major_id

    async def execute(
        self,
        *,
        course: str | None = None,
        risk: str | None = None,
        finding_type: str | None = None,
        major_id: str | None = None,
    ) -> list[DiagnosticFinding]:
        # 优先用显式传入的 major_id，否则用 provider 注入的激活专业
        effective = major_id if major_id is not None else self._active_major_id
        return await self._repository.list_all(
            course=course,
            risk=risk,
            finding_type=finding_type,
            major_id=effective,
        )
