from typing import Protocol

from app.modules.improvements.domain.improvement import (
    Improvement,
    ImprovementStatus,
)


class ImprovementRepository(Protocol):
    async def list_all(
        self,
        *,
        course: str | None = None,
        status: str | None = None,
        major_id: str | None = None,
    ) -> list[Improvement]: ...

    async def get_by_id(self, improvement_id: str) -> Improvement | None: ...

    async def add(self, improvement: Improvement) -> Improvement: ...

    async def update_status(
        self,
        improvement_id: str,
        status: ImprovementStatus,
    ) -> Improvement | None: ...
