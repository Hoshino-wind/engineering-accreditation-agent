from typing import Protocol

from app.modules.resources.domain.resource import TeachingResource


class ResourceRepository(Protocol):
    async def list_all(
        self,
        *,
        course: str | None = None,
        status: str | None = None,
        resource_type: str | None = None,
    ) -> list[TeachingResource]: ...

    async def get_by_id(self, resource_id: str) -> TeachingResource | None: ...
