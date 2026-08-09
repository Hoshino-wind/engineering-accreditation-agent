"""课程内存仓储 + JSON 持久化。"""

from dataclasses import replace

from app.core.json_persistence import JsonPersistenceMixin
from app.modules.courses.domain.course import Course

# 无预置课程：完全由用户录入/导入
_SEED_COURSES: list[Course] = []


class InMemoryCourseRepository(JsonPersistenceMixin):
    """课程仓储，支持 per-user 克隆隔离 + JSON 文件持久化。"""

    _repo_name = "courses"

    def __init__(self, with_seed: bool = True, user_id: str | None = None) -> None:
        self._user_id = user_id or "template"
        if with_seed:
            self._store: dict[str, Course] = {c.id: c for c in _SEED_COURSES}
        else:
            self._store = {}
        self._load()

    def clone(self) -> "InMemoryCourseRepository":
        new_repo = InMemoryCourseRepository(with_seed=False, user_id=self._user_id)
        new_repo._store = {cid: replace(course) for cid, course in self._store.items()}
        return new_repo

    def clone_for_user(self, user_id: str) -> "InMemoryCourseRepository":
        """为指定用户克隆仓储：先加载该用户的持久化数据，若不存在则从模板复制。"""
        new_repo = InMemoryCourseRepository(with_seed=False, user_id=user_id)
        if not new_repo._store:
            new_repo._store = {
                cid: replace(course) for cid, course in self._store.items()
            }
        return new_repo

    def _from_dict(self, data: dict) -> Course | None:
        try:
            return Course(**data)
        except (TypeError, KeyError):
            return None

    async def list_all(self, major_id: str | None = None) -> list[Course]:
        results = list(self._store.values())
        if major_id is not None:
            results = [c for c in results if c.major_id == major_id]
        return results

    async def get_by_id(self, course_id: str) -> Course | None:
        return self._store.get(course_id)

    async def add(self, course: Course) -> Course:
        self._store[course.id] = course
        self._schedule_save()
        return course

    async def delete(self, course_id: str) -> bool:
        existed = self._store.pop(course_id, None) is not None
        if existed:
            self._schedule_save()
        return existed
