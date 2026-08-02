from datetime import UTC, datetime
from uuid import uuid4

from app.modules.evaluations.domain import (
    EvaluationRunReadModel,
    ScoreImportBatch,
    ScoreImportCandidateItem,
    build_score_import_batch,
)


class UtcScoreImportClock:
    def now(self) -> str:
        return datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


class UuidScoreImportIdGenerator:
    def next_batch_id(self) -> str:
        return f"score-batch-{uuid4()}"

    def next_report_id(self) -> str:
        return f"score-report-{uuid4()}"


class DeterministicScoreImportBatchValidator:
    def __init__(self, version: str) -> None:
        if not version or version != version.strip():
            raise ValueError("评分批次校验器版本不能为空且不得包含首尾空白")
        self._version = version

    def create(
        self,
        *,
        batch_id: str,
        report_id: str,
        created_at: str,
        base_run: EvaluationRunReadModel,
        candidate_items: tuple[ScoreImportCandidateItem, ...],
    ) -> ScoreImportBatch:
        return build_score_import_batch(
            batch_id=batch_id,
            report_id=report_id,
            created_at=created_at,
            validator_version=self._version,
            base_run=base_run,
            candidate_items=candidate_items,
        )


__all__ = [
    "DeterministicScoreImportBatchValidator",
    "UtcScoreImportClock",
    "UuidScoreImportIdGenerator",
]
