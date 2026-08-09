"""课程仓储接口。"""

from typing import Protocol

from app.modules.courses.domain.course import Course


class CourseRepository(Protocol):
    async def list_all(self, major_id: str | None = None) -> list[Course]: ...

    async def get_by_id(self, course_id: str) -> Course | None: ...

    async def add(self, course: Course) -> Course: ...

    async def delete(self, course_id: str) -> bool: ...


class CourseGraphProjection(Protocol):
    """课程与能力图谱的投影联动端口：删除课程时需要同步移除图谱中的节点。"""

    async def remove_course(self, course: Course) -> None:
        """从当前能力图谱投影中移除与该课程对应的节点及其边。"""

