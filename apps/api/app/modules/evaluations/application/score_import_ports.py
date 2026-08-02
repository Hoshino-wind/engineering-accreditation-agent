from dataclasses import dataclass
from typing import Protocol

from app.modules.evaluations.domain import (
    EvaluationRunReadModel,
    ScoreImportBatch,
    ScoreImportCandidateItem,
)


@dataclass(frozen=True, slots=True)
class StoredScoreImportBatch:
    batch: ScoreImportBatch
    idempotent_replay: bool


class ScoreImportIdempotencyConflictError(RuntimeError):
    pass


class ScoreImportRepositoryConflictError(RuntimeError):
    pass


class ScoreImportRepository(Protocol):
    async def get_created_batch(
        self,
        *,
        idempotency_key: str,
        request_hash: str,
    ) -> StoredScoreImportBatch | None: ...

    async def create_batch(
        self,
        *,
        idempotency_key: str,
        request_hash: str,
        batch: ScoreImportBatch,
    ) -> StoredScoreImportBatch: ...

    async def get_batch(self, batch_id: str) -> ScoreImportBatch | None: ...


class ScoreImportClock(Protocol):
    def now(self) -> str: ...


class ScoreImportIdGenerator(Protocol):
    def next_batch_id(self) -> str: ...

    def next_report_id(self) -> str: ...


class ScoreImportBatchValidator(Protocol):
    def create(
        self,
        *,
        batch_id: str,
        report_id: str,
        created_at: str,
        base_run: EvaluationRunReadModel,
        candidate_items: tuple[ScoreImportCandidateItem, ...],
    ) -> ScoreImportBatch: ...


__all__ = [
    "ScoreImportBatchValidator",
    "ScoreImportClock",
    "ScoreImportIdGenerator",
    "ScoreImportIdempotencyConflictError",
    "ScoreImportRepository",
    "ScoreImportRepositoryConflictError",
    "StoredScoreImportBatch",
]
