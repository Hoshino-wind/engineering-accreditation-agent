"""查询课程列表。"""

from app.modules.courses.application.ports import CourseRepository
from app.modules.courses.domain.course import Course


class ListCourses:
    def __init__(
        self, repository: CourseRepository, active_major_id: str | None = None
    ) -> None:
        self._repository = repository
        self._active_major_id = active_major_id

    async def execute(self, major_id: str | None = None) -> list[Course]:
        # 优先用显式传入的 major_id，否则用 provider 注入的激活专业
        effective = major_id if major_id is not None else self._active_major_id
        return await self._repository.list_all(major_id=effective)
