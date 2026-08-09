"""查询专业列表。"""

from app.modules.majors.application.ports import MajorRepository
from app.modules.majors.domain.major import Major


class ListMajors:
    def __init__(self, repository: MajorRepository) -> None:
        self._repository = repository

    async def execute(self) -> list[Major]:
        return await self._repository.list_all()
