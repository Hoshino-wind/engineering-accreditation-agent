from app.modules.improvements.application.ports import ImprovementRepository
from app.modules.improvements.domain.improvement import Improvement


class ListImprovements:
    def __init__(
        self, repository: ImprovementRepository, active_major_id: str | None = None
    ) -> None:
        self._repository = repository
        self._active_major_id = active_major_id

    async def execute(
        self,
        *,
        course: str | None = None,
        status: str | None = None,
        major_id: str | None = None,
    ) -> list[Improvement]:
        # 优先用显式传入的 major_id，否则用 provider 注入的激活专业
        effective = major_id if major_id is not None else self._active_major_id
        return await self._repository.list_all(
            course=course, status=status, major_id=effective
        )
