from app.modules.evaluations.application.ports import (
    EvaluationReadRepository,
)
from app.modules.evaluations.domain import EvaluationRunReference


class GetEvaluationRunReference:
    def __init__(
        self,
        repository: EvaluationReadRepository,
    ) -> None:
        self._repository = repository

    async def run(self, run_id: str) -> EvaluationRunReference | None:
        if not run_id:
            return None
        return await self._repository.get_by_run_id(run_id)
