from app.modules.improvements.application.ports import ImprovementRepository


class DeleteImprovement:
    def __init__(self, repository: ImprovementRepository) -> None:
        self._repository = repository

    async def execute(self, improvement_id: str) -> bool:
        return await self._repository.delete(improvement_id)
