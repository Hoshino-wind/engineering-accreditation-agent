"""结构化课程包导入用例。"""

from copy import deepcopy

from app.modules.teaching_graph.application.ports import (
    GraphClock,
    GraphTransitionError,
    GraphWorkspaceRepository,
)
from app.modules.teaching_graph.domain import (
    CoursePackage,
    CoursePackageConflict,
    CoursePackageReferenceError,
    GraphWorkspace,
    build_course_package_objects,
    merge_course_package,
    validate_draft_transition,
)


class GraphWorkspaceNotInitializedError(LookupError):
    """图谱工作区尚未初始化。

    导入不负责创造正式基线：没有基线的草稿永远无法发布，
    凭空造一个会让"正式版本"失去含义。
    """


class CoursePackageConflictError(ValueError):
    def __init__(self, conflicts: tuple[CoursePackageConflict, ...]) -> None:
        super().__init__("课程包与现有图谱对象冲突")
        self.conflicts = conflicts


class ImportCoursePackage:
    def __init__(
        self,
        repository: GraphWorkspaceRepository,
        clock: GraphClock,
        actor: str,
    ) -> None:
        self._repository = repository
        self._clock = clock
        self._actor = actor

    async def run(
        self,
        *,
        package: CoursePackage,
        expected_revision: int,
    ) -> GraphWorkspace:
        current = await self._repository.get()
        if current is None:
            raise GraphWorkspaceNotInitializedError

        nodes, edges = build_course_package_objects(package)
        merge = merge_course_package(current.state, nodes, edges)
        if merge.conflicts:
            raise CoursePackageConflictError(merge.conflicts)

        state = {**current.state, "nodes": merge.nodes, "edges": merge.edges}
        issues = validate_draft_transition(current, state)
        if issues:
            raise GraphTransitionError(issues)

        summary = (
            f"导入课程包 {package.course.code}：新增 {len(merge.added_node_ids)} 个节点、"
            f"{len(merge.added_edge_ids)} 条关系，"
            f"跳过已存在 {len(merge.unchanged_node_ids)} 个节点、"
            f"{len(merge.unchanged_edge_ids)} 条关系"
        )
        return await self._repository.save(
            GraphWorkspace(
                revision=expected_revision + 1,
                state=deepcopy(state),
                updated_at=self._clock.now(),
                updated_by=self._actor,
            ),
            expected_revision=expected_revision,
            action="import_course_package",
            summary=summary,
        )


__all__ = [
    "CoursePackageConflictError",
    "CoursePackageReferenceError",
    "GraphWorkspaceNotInitializedError",
    "ImportCoursePackage",
]
