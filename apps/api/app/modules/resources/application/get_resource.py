from app.modules.resources.application.ports import ResourceRepository
from app.modules.resources.domain.resource import TeachingResource


class GetResource:
    def __init__(self, repository: ResourceRepository) -> None:
        self._repository = repository

    async def execute(self, resource_id: str) -> TeachingResource | None:
        return await self._repository.get_by_id(resource_id)
