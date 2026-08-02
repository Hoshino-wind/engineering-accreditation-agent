from app.modules.evaluations.application.create_score_import_batch import (
    PilotScoreBatchCaptureDisabledError,
)
from app.modules.evaluations.application.score_import_ports import ScoreImportRepository
from app.modules.evaluations.domain import ScoreImportBatch


class GetScoreImportBatch:
    def __init__(
        self,
        repository: ScoreImportRepository,
        *,
        enabled: bool,
    ) -> None:
        self._repository = repository
        self._enabled = enabled

    async def run(self, batch_id: str) -> ScoreImportBatch | None:
        if not self._enabled:
            raise PilotScoreBatchCaptureDisabledError
        return await self._repository.get_batch(batch_id)


__all__ = ["GetScoreImportBatch"]
