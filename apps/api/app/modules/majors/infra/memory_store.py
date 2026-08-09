"""专业内存仓储 + JSON 持久化。

seed 专业为电子信息工程（嵌入式）方向，持久化到 JSON 文件避免重启丢失。
"""

from dataclasses import replace

from app.core.json_persistence import JsonPersistenceMixin
from app.modules.majors.domain.major import Major

_SEED_MAJORS: list[Major] = [
    Major(
        id="major-eie",
        code="080701",
        name="电子信息工程（嵌入式）",
        school_name="示例大学",
        standard_version="2024",
        description="电子信息工程（嵌入式方向），覆盖信号处理、嵌入式系统、通信工程等领域",
    ),
]


class InMemoryMajorRepository(JsonPersistenceMixin):
    """专业仓储，支持 per-user 克隆隔离 + JSON 持久化。"""

    _repo_name = "majors"

    def __init__(self, with_seed: bool = True, user_id: str | None = None) -> None:
        self._user_id = user_id or "template"
        if with_seed:
            self._store: dict[str, Major] = {m.id: m for m in _SEED_MAJORS}
        else:
            self._store = {}
        self._load()

    def clone(self) -> "InMemoryMajorRepository":
        new_repo = InMemoryMajorRepository(with_seed=False, user_id=self._user_id)
        new_repo._store = {mid: replace(major) for mid, major in self._store.items()}
        return new_repo

    def clone_for_user(self, user_id: str) -> "InMemoryMajorRepository":
        new_repo = InMemoryMajorRepository(with_seed=False, user_id=user_id)
        if not new_repo._store:
            new_repo._store = {mid: replace(major) for mid, major in self._store.items()}
        return new_repo

    def _from_dict(self, data: dict) -> Major | None:
        try:
            return Major(**data)
        except (TypeError, KeyError):
            return None

    async def list_all(self) -> list[Major]:
        return list(self._store.values())

    async def get_by_id(self, major_id: str) -> Major | None:
        return self._store.get(major_id)

    async def add(self, major: Major) -> Major:
        self._store[major.id] = major
        self._schedule_save()
        return major

    async def delete(self, major_id: str) -> bool:
        existed = self._store.pop(major_id, None) is not None
        if existed:
            self._schedule_save()
        return existed
