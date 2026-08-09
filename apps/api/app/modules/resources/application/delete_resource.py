"""删除教学资源用例。"""

from app.modules.resources.application.ports import (
    ResourceRepository,
    TaskCancellationPort,
)


class DeleteResource:
    def __init__(
        self,
        repository: ResourceRepository,
        cancellation: TaskCancellationPort | None = None,
    ) -> None:
        self._repository = repository
        self._cancellation = cancellation

    async def execute(self, resource_id: str) -> bool:
        # 先取消可能正在进行的分析任务，再删除资源
        if self._cancellation is not None:
            await self._cancellation.cancel(resource_id)
        return await self._repository.delete(resource_id)
