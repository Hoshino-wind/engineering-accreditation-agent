import hashlib
import json
from dataclasses import dataclass

from app.modules.evaluations.application.ports import (
    EvaluationReadRepository,
    EvaluationRunClock,
    EvaluationRunEvaluator,
    EvaluationRunIdGenerator,
    EvaluationWriteRepository,
)
from app.modules.evaluations.domain import (
    EvaluatedRun,
    EvaluationRunSourceNotReadyError,
)


class EvaluationObjectNotFoundError(LookupError):
    pass


class EvaluationSourceRunNotFoundError(LookupError):
    pass


class EvaluationSourceRunMismatchError(ValueError):
    pass


class EvaluationSourceRunNotReadyError(ValueError):
    def __init__(self, blockers: tuple[str, ...]) -> None:
        super().__init__("评价输入未就绪")
        self.blockers = blockers


@dataclass(frozen=True, slots=True)
class CreateEvaluationRunCommand:
    evaluation_object_id: str
    source_run_id: str
    idempotency_key: str


@dataclass(frozen=True, slots=True)
class CreatedEvaluationRun:
    evaluated: EvaluatedRun
    idempotent_replay: bool


def _request_hash(command: CreateEvaluationRunCommand) -> str:
    material = json.dumps(
        {
            "evaluationObjectId": command.evaluation_object_id,
            "operation": "create-evaluation-run:v1",
            "sourceRunId": command.source_run_id,
        },
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


class CreateEvaluationRun:
    def __init__(
        self,
        read_repository: EvaluationReadRepository,
        write_repository: EvaluationWriteRepository,
        clock: EvaluationRunClock,
        id_generator: EvaluationRunIdGenerator,
        evaluator: EvaluationRunEvaluator,
    ) -> None:
        self._read_repository = read_repository
        self._write_repository = write_repository
        self._clock = clock
        self._id_generator = id_generator
        self._evaluator = evaluator

    async def run(
        self,
        command: CreateEvaluationRunCommand,
    ) -> CreatedEvaluationRun:
        request_hash = _request_hash(command)
        replay = await self._write_repository.get_created_run(
            idempotency_key=command.idempotency_key,
            request_hash=request_hash,
        )
        if replay is not None:
            evaluation_object = await self._read_repository.get_object(
                replay.snapshot.run.evaluation_object_id
            )
            if evaluation_object is None:
                raise EvaluationObjectNotFoundError
            return CreatedEvaluationRun(
                evaluated=EvaluatedRun(
                    evaluation_object=evaluation_object,
                    run=replay.snapshot.run,
                    calculation=replay.snapshot.calculation,
                    source_run_id=replay.source_run_id,
                ),
                idempotent_replay=True,
            )

        evaluation_object = await self._read_repository.get_object(
            command.evaluation_object_id
        )
        if evaluation_object is None:
            raise EvaluationObjectNotFoundError

        source = await self._read_repository.get_run(command.source_run_id)
        if source is None:
            raise EvaluationSourceRunNotFoundError
        if source.run.evaluation_object_id != command.evaluation_object_id:
            raise EvaluationSourceRunMismatchError

        try:
            snapshot = self._evaluator.create(
                source,
                run_id=self._id_generator.next(),
                created_at=self._clock.now(),
            )
        except EvaluationRunSourceNotReadyError as error:
            raise EvaluationSourceRunNotReadyError(
                error.blockers
            ) from error
        stored = await self._write_repository.create_run(
            idempotency_key=command.idempotency_key,
            request_hash=request_hash,
            source_run_id=command.source_run_id,
            snapshot=snapshot,
        )
        return CreatedEvaluationRun(
            evaluated=EvaluatedRun(
                evaluation_object=evaluation_object,
                run=stored.snapshot.run,
                calculation=stored.snapshot.calculation,
                source_run_id=stored.source_run_id,
            ),
            idempotent_replay=stored.idempotent_replay,
        )


__all__ = [
    "CreateEvaluationRun",
    "CreateEvaluationRunCommand",
    "CreatedEvaluationRun",
    "EvaluationObjectNotFoundError",
    "EvaluationSourceRunMismatchError",
    "EvaluationSourceRunNotFoundError",
    "EvaluationSourceRunNotReadyError",
]
