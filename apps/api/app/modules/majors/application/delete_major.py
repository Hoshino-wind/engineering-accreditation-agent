"""删除专业。"""

from app.modules.majors.application.ports import MajorRepository


class MajorNotFoundError(Exception):
    pass


class DeleteMajor:
    def __init__(self, repository: MajorRepository) -> None:
        self._repository = repository

    async def execute(self, major_id: str) -> None:
        deleted = await self._repository.delete(major_id)
        if not deleted:
            raise MajorNotFoundError(f"专业不存在：{major_id}")
