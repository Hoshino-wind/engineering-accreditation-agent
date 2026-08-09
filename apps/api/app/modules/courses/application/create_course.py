"""新建课程。"""

import re

from app.modules.courses.application.ports import CourseRepository
from app.modules.courses.domain.course import Course


class CourseAlreadyExistsError(Exception):
    pass


def _slugify(name: str) -> str:
    base = re.sub(r"[^0-9a-zA-Z\u4e00-\u9fa5]+", "-", name.strip()).strip("-").lower()
    return base or "course"


def _new_id(existing: list[Course], name: str) -> str:
    slug = _slugify(name)
    candidate = f"course-{slug}"
    used = {c.id for c in existing}
    if candidate not in used:
        return candidate
    for i in range(2, 1000):
        alt = f"course-{slug}-{i}"
        if alt not in used:
            return alt
    return f"course-{slug}-dup"


class CreateCourse:
    def __init__(
        self, repository: CourseRepository, active_major_id: str | None = None
    ) -> None:
        self._repository = repository
        self._active_major_id = active_major_id

    async def execute(
        self,
        *,
        name: str,
        code: str | None = None,
        credits: float | None = None,
        semester: str | None = None,
        description: str | None = None,
        major_id: str | None = None,
    ) -> Course:
        cleaned_name = name.strip()
        if not cleaned_name:
            raise ValueError("课程名称不能为空")
        # 优先用显式传入的 major_id，否则用 provider 注入的激活专业，最后兜底 seed 专业
        effective_major = major_id or self._active_major_id or "major-eie"
        existing = await self._repository.list_all()
        if any(c.name == cleaned_name for c in existing):
            raise CourseAlreadyExistsError(f"已存在同名课程：{cleaned_name}")
        course = Course(
            id=_new_id(existing, cleaned_name),
            code=(code or "").strip(),
            name=cleaned_name,
            credits=credits,
            semester=(semester.strip() if semester else None),
            major_id=effective_major,
            description=(description.strip() if description else None),
            graph_node_id=None,
        )
        return await self._repository.add(course)
