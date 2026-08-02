from dataclasses import dataclass
from typing import Protocol

from app.modules.evaluations.domain import (
    EvaluationObject,
    EvaluationRunReference,
    EvaluationRunSnapshot,
)


class EvaluationReadRepository(Protocol):
    async def list_objects(self) -> tuple[EvaluationObject, ...]: ...

    async def get_object(
        self,
        evaluation_object_id: str,
    ) -> EvaluationObject | None: ...

    async def get_run(
        self,
        run_id: str,
    ) -> EvaluationRunSnapshot | None: ...

    async def get_by_run_id(
        self,
        run_id: str,
    ) -> EvaluationRunReference | None: ...

    async def get_source_run_id(self, run_id: str) -> str | None: ...


@dataclass(frozen=True, slots=True)
class StoredEvaluationRun:
    snapshot: EvaluationRunSnapshot
    source_run_id: str
    idempotent_replay: bool


class EvaluationRunIdempotencyConflictError(RuntimeError):
    pass


class EvaluationWriteRepository(Protocol):
    async def get_created_run(
        self,
        *,
        idempotency_key: str,
        request_hash: str,
    ) -> StoredEvaluationRun | None: ...

    async def create_run(
        self,
        *,
        idempotency_key: str,
        request_hash: str,
        source_run_id: str,
        snapshot: EvaluationRunSnapshot,
    ) -> StoredEvaluationRun: ...


class EvaluationRunClock(Protocol):
    def now(self) -> str: ...


class EvaluationRunIdGenerator(Protocol):
    def next(self) -> str: ...


class EvaluationRunEvaluator(Protocol):
    def create(
        self,
        source: EvaluationRunSnapshot,
        *,
        run_id: str,
        created_at: str,
    ) -> EvaluationRunSnapshot: ...
