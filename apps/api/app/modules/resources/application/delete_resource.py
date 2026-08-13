"""删除教学资源用例。"""

from typing import Protocol

from app.modules.resources.application.ports import (
    ObjectStoragePort,
    ResourceRepository,
    TaskCancellationPort,
)


class _CandidateCleaner(Protocol):
    """删除材料时联动清理候选的最小接口。"""

    async def delete_by_course(self, course_name: str) -> int: ...
    async def delete_by_evidence_resource(self, resource_name: str) -> int: ...
    async def delete_by_evidence_resource_id(self, resource_id: str) -> int: ...
    async def delete_by_source_nodes(self, source_node_ids: set[str]) -> int: ...
    async def delete_by_major(self, major_id: str) -> int: ...


class _FindingCleaner(Protocol):
    """删除材料时联动清理诊断发现的最小接口。"""

    async def delete_by_course(self, course_name: str) -> int: ...
    async def delete_by_evidence_object(self, object_name: str) -> int: ...
    async def delete_by_evidence_resource_id(self, resource_id: str) -> int: ...
    async def delete_by_nodes(self, node_ids: set[str]) -> int: ...
    async def delete_by_major(self, major_id: str) -> int: ...


class _GraphCleaner(Protocol):
    """删除材料时联动清理能力图谱的最小接口。"""

    async def remove_material(
        self,
        material_names: set[str],
        resource_ids: set[str] | None = None,
    ) -> set[str]: ...
    async def retain_materials(self, valid_resource_ids: set[str]) -> set[str]: ...
    async def clear_school_graph(self, course_name: str | None = None) -> set[str]: ...


class DeleteResource:
    def __init__(
        self,
        repository: ResourceRepository,
        cancellation: TaskCancellationPort | None = None,
        candidates_repo: _CandidateCleaner | None = None,
        findings_repo: _FindingCleaner | None = None,
        graph_projection: _GraphCleaner | None = None,
        active_major_id: str | None = None,
        object_storage: ObjectStoragePort | None = None,
    ) -> None:
        self._repository = repository
        self._cancellation = cancellation
        self._candidates = candidates_repo
        self._findings = findings_repo
        self._graph_projection = graph_projection
        self._active_major_id = active_major_id
        self._object_storage = object_storage

    async def execute(self, resource_id: str) -> bool:
        import logging

        logger = logging.getLogger(__name__)
        # 先取消可能正在进行的分析任务，再删除资源
        if self._cancellation is not None:
            await self._cancellation.cancel(resource_id)
        resource = await self._repository.get_by_id(resource_id)
        if resource is None:
            return False

        version_group_id = resource.version_group_id or resource.id
        if resource.is_current_version:
            scoped_resources = await self._repository.list_all(
                course=resource.course,
                major_id=resource.major_id,
            )
            versions = [
                item
                for item in scoped_resources
                if (item.version_group_id or item.id) == version_group_id
            ]
        else:
            versions = [resource]

        version_ids = {item.id for item in versions}
        for item in versions:
            if self._cancellation is not None and item.id != resource_id:
                await self._cancellation.cancel(item.id)
            if item.object_key and self._object_storage is not None:
                await self._object_storage.delete(key=item.object_key)
            await self._repository.delete(item.id)

        # 级联清理：按资源名/文件名匹配证据引用（候选、诊断发现），
        # 并撤销该材料在能力图谱中派生出的学校节点与关系。
        names = {n for n in (resource.name, resource.file_name) if n}
        removed_node_ids: set[str] = set()
        remaining_resources = await self._repository.list_all(
            major_id=resource.major_id or self._active_major_id,
        )
        valid_resource_ids = {item.id for item in remaining_resources}
        if self._graph_projection is not None:
            try:
                removed_node_ids = await self._graph_projection.remove_material(
                    names,
                    version_ids,
                )
                removed_node_ids |= await self._graph_projection.retain_materials(
                    valid_resource_ids
                )
                if removed_node_ids:
                    logger.info(
                        "删除材料「%s」后联动清理图谱节点 %d 个",
                        resource.name,
                        len(removed_node_ids),
                    )
            except Exception:  # noqa: BLE001
                logger.exception("清理材料关联图谱失败，忽略")
        if self._candidates is not None:
            for version_id in version_ids:
                try:
                    await self._candidates.delete_by_evidence_resource_id(version_id)
                except Exception:  # noqa: BLE001
                    logger.exception("按材料 ID 清理关联候选失败，回退到名称清理")
            for name in names:
                try:
                    n = await self._candidates.delete_by_evidence_resource(name)
                    if n:
                        logger.info("删除材料「%s」后联动清理候选 %d 条", name, n)
                except Exception:  # noqa: BLE001
                    logger.exception("清理材料关联候选失败，忽略")
            if removed_node_ids:
                try:
                    n = await self._candidates.delete_by_source_nodes(removed_node_ids)
                    if n:
                        logger.info(
                            "删除材料「%s」后按图谱节点联动清理候选 %d 条",
                            resource.name,
                            n,
                        )
                except Exception:  # noqa: BLE001
                    logger.exception("按图谱节点清理候选失败，忽略")
            if not valid_resource_ids:
                try:
                    await self._candidates.delete_by_major(
                        resource.major_id or self._active_major_id or "major-eie"
                    )
                except Exception:  # noqa: BLE001
                    logger.exception("材料清空后按专业清理历史候选失败，忽略")
        if self._findings is not None:
            for version_id in version_ids:
                try:
                    await self._findings.delete_by_evidence_resource_id(version_id)
                except Exception:  # noqa: BLE001
                    logger.exception("按材料 ID 清理关联诊断失败，回退到名称清理")
            for name in names:
                try:
                    n = await self._findings.delete_by_evidence_object(name)
                    if n:
                        logger.info("删除材料「%s」后联动清理诊断发现 %d 条", name, n)
                except Exception:  # noqa: BLE001
                    logger.exception("清理材料关联诊断发现失败，忽略")
            if removed_node_ids:
                try:
                    n = await self._findings.delete_by_nodes(removed_node_ids)
                    if n:
                        logger.info(
                            "删除材料「%s」后按图谱节点联动清理诊断发现 %d 条",
                            resource.name,
                            n,
                        )
                except Exception:  # noqa: BLE001
                    logger.exception("按图谱节点清理诊断发现失败，忽略")
            if not valid_resource_ids:
                try:
                    await self._findings.delete_by_major(
                        resource.major_id or self._active_major_id or "major-eie"
                    )
                except Exception:  # noqa: BLE001
                    logger.exception("材料清空后按专业清理历史诊断失败，忽略")
        return True

    async def execute_scope(
        self,
        *,
        course: str | None = None,
        clear_graph: bool = False,
    ) -> int:
        """清空当前专业/课程范围内的材料，并可同步清空派生图谱。

        单条删除依赖资源记录本身；但用户可能已经从本地文件夹或旧数据中
        把材料清单清空了，图谱仍有残留。clear_graph=True 时即使资源为 0，
        也会撤销当前范围的学校侧图谱节点、候选关系和诊断发现。
        """
        import logging

        logger = logging.getLogger(__name__)
        resources = await self._repository.list_all(
            course=course,
            major_id=self._active_major_id,
        )
        deleted_count = 0
        for resource in list(resources):
            if await self.execute(resource.id):
                deleted_count += 1

        removed_node_ids: set[str] = set()
        if clear_graph and self._graph_projection is not None:
            try:
                removed_node_ids = await self._graph_projection.clear_school_graph(course)
                if removed_node_ids:
                    logger.info(
                        "清空范围「%s」后联动清理图谱节点 %d 个",
                        course or "当前专业",
                        len(removed_node_ids),
                    )
            except Exception:  # noqa: BLE001
                logger.exception("清空范围关联图谱失败，忽略")

        if removed_node_ids and self._candidates is not None:
            try:
                await self._candidates.delete_by_source_nodes(removed_node_ids)
            except Exception:  # noqa: BLE001
                logger.exception("清空范围后按图谱节点清理候选失败，忽略")

        if removed_node_ids and self._findings is not None:
            try:
                await self._findings.delete_by_nodes(removed_node_ids)
            except Exception:  # noqa: BLE001
                logger.exception("清空范围后按图谱节点清理诊断发现失败，忽略")

        # 当前专业本来就没有资源时，removed_node_ids 可能为空，但迁移前的
        # 候选/诊断仍可能残留。全专业清空操作必须以材料真源为准一并收敛。
        if clear_graph and not course:
            major_id = self._active_major_id or "major-eie"
            if self._candidates is not None:
                try:
                    await self._candidates.delete_by_major(major_id)
                except Exception:  # noqa: BLE001
                    logger.exception("清空专业后清理历史候选失败，忽略")
            if self._findings is not None:
                try:
                    await self._findings.delete_by_major(major_id)
                except Exception:  # noqa: BLE001
                    logger.exception("清空专业后清理历史诊断失败，忽略")

        if course:
            if self._candidates is not None:
                try:
                    await self._candidates.delete_by_course(course)
                except Exception:  # noqa: BLE001
                    logger.exception("清空范围后按课程清理候选失败，忽略")
            if self._findings is not None:
                try:
                    await self._findings.delete_by_course(course)
                except Exception:  # noqa: BLE001
                    logger.exception("清空范围后按课程清理诊断发现失败，忽略")

        return deleted_count
