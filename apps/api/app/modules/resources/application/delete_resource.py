"""删除教学资源用例。"""

from typing import Protocol

from app.modules.resources.application.ports import (
    ResourceRepository,
    TaskCancellationPort,
)


class _RelatedCleaner(Protocol):
    """删除材料时联动清理派生数据的最小接口（候选/发现按证据引用匹配）。"""

    async def delete_by_evidence_resource(self, resource_name: str) -> int: ...
    async def delete_by_evidence_object(self, object_name: str) -> int: ...


class DeleteResource:
    def __init__(
        self,
        repository: ResourceRepository,
        cancellation: TaskCancellationPort | None = None,
        candidates_repo: _RelatedCleaner | None = None,
        findings_repo: _RelatedCleaner | None = None,
    ) -> None:
        self._repository = repository
        self._cancellation = cancellation
        self._candidates = candidates_repo
        self._findings = findings_repo

    async def execute(self, resource_id: str) -> bool:
        import logging

        logger = logging.getLogger(__name__)
        # 先取消可能正在进行的分析任务，再删除资源
        if self._cancellation is not None:
            await self._cancellation.cancel(resource_id)
        resource = await self._repository.get_by_id(resource_id)
        deleted = await self._repository.delete(resource_id)
        if not deleted or resource is None:
            return deleted

        # 级联清理：按资源名/文件名匹配证据引用（候选、诊断发现）
        names = {n for n in (resource.name, resource.file_name) if n}
        if self._candidates is not None:
            for name in names:
                try:
                    n = await self._candidates.delete_by_evidence_resource(name)
                    if n:
                        logger.info("删除材料「%s」后联动清理候选 %d 条", name, n)
                except Exception:  # noqa: BLE001
                    logger.exception("清理材料关联候选失败，忽略")
        if self._findings is not None:
            for name in names:
                try:
                    n = await self._findings.delete_by_evidence_object(name)
                    if n:
                        logger.info("删除材料「%s」后联动清理诊断发现 %d 条", name, n)
                except Exception:  # noqa: BLE001
                    logger.exception("清理材料关联诊断发现失败，忽略")
        return deleted
