from app.modules.evaluations.application.ports import EvaluationReadRepository
from app.modules.evaluations.domain import (
    EvaluationPreflightReport,
    build_evaluation_preflight_report,
)


class GetEvaluationPreflight:
    def __init__(self, repository: EvaluationReadRepository) -> None:
        self._repository = repository

    async def run(self, run_id: str) -> EvaluationPreflightReport | None:
        snapshot = await self._repository.get_run(run_id)
        if snapshot is None:
            return None
        return build_evaluation_preflight_report(snapshot)


__all__ = ["GetEvaluationPreflight"]
