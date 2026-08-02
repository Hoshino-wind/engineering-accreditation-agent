from datetime import UTC, datetime
from uuid import uuid4

from app.modules.evaluations.domain import (
    EvaluationRunSnapshot,
    create_evaluation_run_from_snapshot,
)


class DeterministicEvaluationRunEvaluator:
    def __init__(self, version: str) -> None:
        if not version or version != version.strip():
            raise ValueError("评价程序版本不能为空且不得包含首尾空白")
        self._version = version

    def create(
        self,
        source: EvaluationRunSnapshot,
        *,
        run_id: str,
        created_at: str,
    ) -> EvaluationRunSnapshot:
        return create_evaluation_run_from_snapshot(
            source,
            run_id=run_id,
            created_at=created_at,
            program_version=self._version,
        )


class UtcEvaluationRunClock:
    def now(self) -> str:
        return datetime.now(UTC).isoformat(timespec="seconds").replace(
            "+00:00", "Z"
        )


class UuidEvaluationRunIdGenerator:
    def next(self) -> str:
        return f"eval-{uuid4()}"
