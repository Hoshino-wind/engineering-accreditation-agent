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
    PER_STUDENT_PROFILE,
    SCORE_IMPORT_PROFILE,
    MissingScorePolicy,
    PerStudentScoreItem,
    ScoreImportCandidateItem,
    ScoreImportProfile,
    build_evaluation_preflight_report,
    per_student_payload,
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
class PerStudentScoreCommandPayload:
    items: tuple[PerStudentScoreItem, ...]
    missing_score_policy: MissingScorePolicy
    score_rate_scale: int


@dataclass(frozen=True, slots=True)
class CreateScoreImportBatchCommand:
    """创建评分批次。

    ``candidate_items`` 用于汇总口径；``per_student`` 用于逐生口径。
    两者互斥，由 ``profile`` 决定，命令构造时即已校验。
    """

    evaluation_object_id: str
    base_run_id: str
    profile: ScoreImportProfile
    candidate_items: tuple[ScoreImportCandidateItem, ...]
    idempotency_key: str
    per_student: PerStudentScoreCommandPayload | None = None

    def __post_init__(self) -> None:
        if self.profile == PER_STUDENT_PROFILE:
            if self.per_student is None:
                raise ValueError("逐生口径必须提供逐生评分输入")
            if self.candidate_items:
                raise ValueError("逐生口径不得直接提供汇总评分输入")
        elif self.profile == SCORE_IMPORT_PROFILE:
            if self.per_student is not None:
                raise ValueError("汇总口径不得提供逐生评分输入")
            if not self.candidate_items:
                raise ValueError("汇总口径必须提供汇总评分输入")
        else:
            raise ValueError("不支持的试点评分契约")


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
        request_hash = score_import_request_hash(
            evaluation_object_id=command.evaluation_object_id,
            base_run_id=command.base_run_id,
            profile=command.profile,
            candidate_items=command.candidate_items,
            per_student=(
                None
                if command.per_student is None
                else per_student_payload(
                    items=command.per_student.items,
                    missing_score_policy=command.per_student.missing_score_policy,
                    score_rate_scale=command.per_student.score_rate_scale,
                )
            ),
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
        batch_id = self._id_generator.next_batch_id()
        report_id = self._id_generator.next_report_id()
        if command.per_student is None:
            batch = self._validator.create(
                batch_id=batch_id,
                report_id=report_id,
                created_at=created_at,
                base_run=base.run,
                candidate_items=command.candidate_items,
            )
        else:
            batch = self._validator.create_per_student(
                batch_id=batch_id,
                report_id=report_id,
                created_at=created_at,
                base_run=base.run,
                items=command.per_student.items,
                missing_score_policy=command.per_student.missing_score_policy,
                score_rate_scale=command.per_student.score_rate_scale,
            )
        return await self._score_repository.create_batch(
            idempotency_key=command.idempotency_key,
            request_hash=request_hash,
            batch=batch,
        )


__all__ = [
    "CreateScoreImportBatch",
    "CreateScoreImportBatchCommand",
    "PerStudentScoreCommandPayload",
    "PilotScoreBatchCaptureDisabledError",
    "ScoreImportBaseRunDoesNotNeedScoreDataError",
    "ScoreImportBaseRunMismatchError",
    "ScoreImportBaseRunNotFoundError",
    "ScoreImportEvaluationObjectNotFoundError",
]
