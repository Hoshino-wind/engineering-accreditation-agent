from app.modules.resources.application.ports import ResourceRepository
from app.modules.resources.domain.resource import TeachingResource


class ListResources:
    def __init__(self, repository: ResourceRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        *,
        course: str | None = None,
        status: str | None = None,
        resource_type: str | None = None,
    ) -> list[TeachingResource]:
        return await self._repository.list_all(
            course=course,
            status=status,
            resource_type=resource_type,
        )
