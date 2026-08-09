"""删除课程。"""

from __future__ import annotations

import logging
from typing import Protocol

from app.modules.courses.application.ports import CourseGraphProjection, CourseRepository

logger = logging.getLogger(__name__)


class _CandidateCleaner(Protocol):
    """删除课程时可选联动清理候选的最小接口（Protocol，避免强耦合 import）。"""

    async def delete_by_course(self, course_name: str) -> int: ...
    async def delete_by_source_nodes(self, source_node_ids: set[str]) -> int: ...


class CourseNotFoundError(Exception):
    pass


class _FindingCleaner(Protocol):
    """删除课程时联动清理诊断发现的最小接口。"""

    async def delete_by_course(self, course_name: str) -> int: ...
    async def delete_by_nodes(self, node_ids: set[str]) -> int: ...


class _ImprovementCleaner(Protocol):
    """删除课程时联动清理改进建议的最小接口。"""

    async def delete_by_course(self, course_name: str) -> int: ...


class DeleteCourse:
    def __init__(
        self,
        repository: CourseRepository,
        graph_projection: CourseGraphProjection | None = None,
        candidates_repo: _CandidateCleaner | None = None,
        findings_repo: _FindingCleaner | None = None,
        improvements_repo: _ImprovementCleaner | None = None,
    ) -> None:
        self._repository = repository
        self._graph_projection = graph_projection
        self._candidates = candidates_repo
        self._findings = findings_repo
        self._improvements = improvements_repo

    async def execute(self, course_id: str) -> None:
        course = await self._repository.get_by_id(course_id)
        if course is None:
            raise CourseNotFoundError(f"课程不存在：{course_id}")

        deleted = await self._repository.delete(course_id)
        if not deleted:
            raise CourseNotFoundError(f"课程不存在：{course_id}")

        # 1. 清理图谱投影：移除课程节点 + 下层实验/知识点/教学资源
        removed_node_ids: set[str] = set()
        if self._graph_projection is not None:
            try:
                result = await self._graph_projection.remove_course(course)
                if isinstance(result, set):
                    removed_node_ids = result
            except Exception:  # noqa: BLE001
                logger.exception("同步移除图谱课程节点失败，忽略不影响删除主流程")

        # 2. 清理候选：a) 按 course 字段匹配 b) 按刚被删掉的图谱节点 id 匹配
        if self._candidates is not None:
            try:
                n1 = await self._candidates.delete_by_course(course.name or "")
                n2 = (
                    await self._candidates.delete_by_source_nodes(removed_node_ids)
                    if removed_node_ids
                    else 0
                )
                if n1 + n2:
                    logger.info(
                        "删除课程「%s」后联动清理候选: course 命中 %d 条, 节点命中 %d 条",
                        course.name,
                        n1,
                        n2,
                    )
            except Exception:  # noqa: BLE001
                logger.exception("清理课程关联候选失败，忽略不影响删除主流程")

        # 3. 清理诊断发现：按 course 名 + 被删图谱节点
        if self._findings is not None:
            try:
                n1 = await self._findings.delete_by_course(course.name or "")
                n2 = (
                    await self._findings.delete_by_nodes(removed_node_ids)
                    if removed_node_ids
                    else 0
                )
                if n1 + n2:
                    logger.info(
                        "删除课程「%s」后联动清理诊断发现: course 命中 %d 条, 节点命中 %d 条",
                        course.name,
                        n1,
                        n2,
                    )
            except Exception:  # noqa: BLE001
                logger.exception("清理课程关联诊断发现失败，忽略不影响删除主流程")

        # 4. 清理改进建议：按 course 名
        if self._improvements is not None:
            try:
                n = await self._improvements.delete_by_course(course.name or "")
                if n:
                    logger.info("删除课程「%s」后联动清理改进建议: %d 条", course.name, n)
            except Exception:  # noqa: BLE001
                logger.exception("清理课程关联改进建议失败，忽略不影响删除主流程")
