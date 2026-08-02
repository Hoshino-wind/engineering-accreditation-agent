from app.modules.evaluations.application.ports import EvaluationReadRepository
from app.modules.evaluations.domain import EvaluatedRun


class EvaluationReadModelIntegrityError(RuntimeError):
    pass


class ListEvaluationObjects:
    def __init__(self, repository: EvaluationReadRepository) -> None:
        self._repository = repository

    async def run(self) -> tuple[EvaluatedRun, ...]:
        evaluated: list[EvaluatedRun] = []
        for evaluation_object in await self._repository.list_objects():
            snapshot = await self._repository.get_run(
                evaluation_object.presented_run_id
            )
            if (
                snapshot is None
                or snapshot.run.evaluation_object_id
                != evaluation_object.evaluation_object_id
            ):
                raise EvaluationReadModelIntegrityError(
                    "评价对象的展示运行不存在或归属不一致"
                )
            evaluated.append(
                EvaluatedRun(
                    evaluation_object=evaluation_object,
                    run=snapshot.run,
                    calculation=snapshot.calculation,
                )
            )
        return tuple(evaluated)


class GetEvaluationRun:
    def __init__(self, repository: EvaluationReadRepository) -> None:
        self._repository = repository

    async def run(self, run_id: str) -> EvaluatedRun | None:
        if not run_id:
            return None
        snapshot = await self._repository.get_run(run_id)
        if snapshot is None:
            return None
        evaluation_object = await self._repository.get_object(
            snapshot.run.evaluation_object_id
        )
        if evaluation_object is None:
            raise EvaluationReadModelIntegrityError(
                "评价运行引用了不存在的评价对象"
            )
        return EvaluatedRun(
            evaluation_object=evaluation_object,
            run=snapshot.run,
            calculation=snapshot.calculation,
            source_run_id=await self._repository.get_source_run_id(run_id),
        )
