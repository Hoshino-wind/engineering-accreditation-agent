"""确认 AI 识别出的候选课程：创建课程（同名则复用）并回写 resource.course。

并发安全说明：
- 候选阶段（suggested_course）只读不建课，多文件并发提取互不干扰。
- 确认时才调 CreateCourse；若两个请求并发确认同名课程，CreateCourse 的同名校验
  会让后到者抛 CourseAlreadyExistsError，本用例捕获后回查现有课程复用，保证幂等。
"""

from dataclasses import replace as dc_replace

from app.modules.courses.application.create_course import CourseAlreadyExistsError
from app.modules.courses.application.ports import CourseRepository
from app.modules.courses.domain.course import Course
from app.modules.resources.application.ports import ResourceRepository
from app.modules.resources.domain.resource import TeachingResource


class ResourceNotFoundError(Exception):
    pass


class ConfirmSuggestedCourse:
    def __init__(
        self,
        resource_repository: ResourceRepository,
        course_repository: CourseRepository,
        active_major_id: str | None = None,
    ) -> None:
        self._resources = resource_repository
        self._courses = course_repository
        self._active_major_id = active_major_id

    async def execute(
        self,
        *,
        resource_id: str,
        name: str,
        code: str | None = None,
        credits: float | None = None,
        semester: str | None = None,
        description: str | None = None,
    ) -> tuple[TeachingResource, Course]:
        resource = await self._resources.get_by_id(resource_id)
        if resource is None:
            raise ResourceNotFoundError(f"教学资源不存在：{resource_id}")

        cleaned_name = name.strip()
        if not cleaned_name:
            raise ValueError("课程名称不能为空")

        # 先看是否已有同名课程，有则直接复用（覆盖并发确认同名场景）
        existing = await self._courses.list_all()
        reused = next(
            (c for c in existing if c.name == cleaned_name and c.major_id == resource.major_id),
            None,
        )
        if reused is not None:
            course = reused
        else:
            # 走 CreateCourse 正规流程（含 id 生成、slug、major 归属）
            from app.modules.courses.application.create_course import CreateCourse

            creator = CreateCourse(
                repository=self._courses, active_major_id=self._active_major_id
            )
            try:
                course = await creator.execute(
                    name=cleaned_name,
                    code=code,
                    credits=credits,
                    semester=semester,
                    description=description,
                    major_id=resource.major_id,
                )
            except CourseAlreadyExistsError:
                # 并发竞态：在 list_all 与 add 之间被抢先创建，回查复用
                existing = await self._courses.list_all()
                course = next(
                    (
                        c
                        for c in existing
                        if c.name == cleaned_name and c.major_id == resource.major_id
                    ),
                    None,
                )
                if course is None:
                    raise

        # 回写 resource.course 字符串，并清空 suggested_course（已确认）
        updated = dc_replace(resource, course=course.name, suggested_course=None)
        await self._resources.update(updated)
        return updated, course
