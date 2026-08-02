from dataclasses import dataclass

from app.modules.evaluations.application.ports import EvaluationReadRepository
from app.modules.evaluations.application.score_import_ports import (
    ScoreImportBatchValidator,
    ScoreImportClock,
    ScoreImportIdGenerator,
    ScoreImportRepository,
    StoredScoreImportBatch,
)
from app.modules.evaluations.domain import (
    SCORE_IMPORT_PROFILE,
    ScoreImportCandidateItem,
    ScoreImportProfile,
    build_evaluation_preflight_report,
    score_import_request_hash,
)


class PilotScoreBatchCaptureDisabledError(RuntimeError):
    pass


class ScoreImportEvaluationObjectNotFoundError(LookupError):
    pass


class ScoreImportBaseRunNotFoundError(LookupError):
    pass


class ScoreImportBaseRunMismatchError(ValueError):
    pass


class ScoreImportBaseRunDoesNotNeedScoreDataError(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class CreateScoreImportBatchCommand:
    evaluation_object_id: str
    base_run_id: str
    profile: ScoreImportProfile
    candidate_items: tuple[ScoreImportCandidateItem, ...]
    idempotency_key: str


class CreateScoreImportBatch:
    def __init__(
        self,
        read_repository: EvaluationReadRepository,
        score_repository: ScoreImportRepository,
        clock: ScoreImportClock,
        id_generator: ScoreImportIdGenerator,
        validator: ScoreImportBatchValidator,
        *,
        enabled: bool,
    ) -> None:
        self._read_repository = read_repository
        self._score_repository = score_repository
        self._clock = clock
        self._id_generator = id_generator
        self._validator = validator
        self._enabled = enabled

    async def run(
        self,
        command: CreateScoreImportBatchCommand,
    ) -> StoredScoreImportBatch:
        if not self._enabled:
            raise PilotScoreBatchCaptureDisabledError
        if command.profile != SCORE_IMPORT_PROFILE:
            raise ValueError("不支持的试点评分汇总契约")
        request_hash = score_import_request_hash(
            evaluation_object_id=command.evaluation_object_id,
            base_run_id=command.base_run_id,
            profile=command.profile,
            candidate_items=command.candidate_items,
        )
        replay = await self._score_repository.get_created_batch(
            idempotency_key=command.idempotency_key,
            request_hash=request_hash,
        )
        if replay is not None:
            return replay

        evaluation_object = await self._read_repository.get_object(
            command.evaluation_object_id
        )
        if evaluation_object is None:
            raise ScoreImportEvaluationObjectNotFoundError
        base = await self._read_repository.get_run(command.base_run_id)
        if base is None:
            raise ScoreImportBaseRunNotFoundError
        if base.run.evaluation_object_id != command.evaluation_object_id:
            raise ScoreImportBaseRunMismatchError
        preflight = build_evaluation_preflight_report(base)
        if not any(
            check.status == "blocked" and check.action == "prepare_score_data"
            for check in preflight.checks
        ):
            raise ScoreImportBaseRunDoesNotNeedScoreDataError

        created_at = self._clock.now()
        batch = self._validator.create(
            batch_id=self._id_generator.next_batch_id(),
            report_id=self._id_generator.next_report_id(),
            created_at=created_at,
            base_run=base.run,
            candidate_items=command.candidate_items,
        )
        return await self._score_repository.create_batch(
            idempotency_key=command.idempotency_key,
            request_hash=request_hash,
            batch=batch,
        )


__all__ = [
    "CreateScoreImportBatch",
    "CreateScoreImportBatchCommand",
    "PilotScoreBatchCaptureDisabledError",
    "ScoreImportBaseRunDoesNotNeedScoreDataError",
    "ScoreImportBaseRunMismatchError",
    "ScoreImportBaseRunNotFoundError",
    "ScoreImportEvaluationObjectNotFoundError",
]
