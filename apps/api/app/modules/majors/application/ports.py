"""专业仓储接口。"""

from typing import Protocol

from app.modules.majors.domain.major import Major


class MajorRepository(Protocol):
    async def list_all(self) -> list[Major]: ...

    async def get_by_id(self, major_id: str) -> Major | None: ...

    async def add(self, major: Major) -> Major: ...

    async def delete(self, major_id: str) -> bool: ...
