import asyncio
import sqlite3
from pathlib import Path

import pytest
from app.modules.evaluations.application import (
    GetEvaluationRun,
    GetEvaluationRunReference,
    ListEvaluationObjects,
)
from app.modules.evaluations.domain import calculate_attainment
from app.modules.evaluations.infra import (
    EvaluationReadModelConflictError,
    EvaluationRunReferenceConflictError,
    SqliteEvaluationReadRepository,
    build_local_evaluation_read_repository_at,
)


def build_repository(
    database_path: Path,
) -> SqliteEvaluationReadRepository:
    return build_local_evaluation_read_repository_at(database_path)


def test_get_evaluation_run_reference_uses_an_exact_opaque_id(
    tmp_path: Path,
) -> None:
    repository = build_repository(tmp_path / "evaluation.sqlite3")
    use_case = GetEvaluationRunReference(repository)

    result = asyncio.run(use_case.run("eval-2026-071"))
    decorated_result = asyncio.run(
        use_case.run("  eval-2026-071  ")
    )

    assert result is not None
    assert result.evaluation_object_id == "evaluation-ct6"
    assert decorated_result is None


def test_get_evaluation_run_reference_returns_none_for_unknown_run(
    tmp_path: Path,
) -> None:
    repository = build_repository(tmp_path / "evaluation.sqlite3")
    use_case = GetEvaluationRunReference(repository)

    assert asyncio.run(use_case.run("eval-unknown")) is None
    assert asyncio.run(use_case.run("Eval-2026-071")) is None


def test_repository_reopens_with_the_same_read_projection(
    tmp_path: Path,
) -> None:
    database_path = tmp_path / "evaluation.sqlite3"
    build_repository(database_path)

    reopened = build_repository(database_path)
    objects = asyncio.run(reopened.list_objects())

    assert len(objects) == 6
    assert [item.evaluation_object_id for item in objects] == [
        "evaluation-ct3",
        "evaluation-ct4",
        "evaluation-ct2",
        "evaluation-ct5",
        "evaluation-ct1",
        "evaluation-ct6",
    ]
    assert [item.display_order for item in objects] == [1, 2, 3, 4, 5, 6]
    assert [item.presented_run_id for item in objects] == [
        "eval-2026-066",
        "eval-2026-067",
        "eval-2026-069",
        "eval-2026-068",
        "eval-2026-070",
        "eval-2026-071",
    ]
    assert len({item.evaluation_object_id for item in objects}) == len(
        objects
    )


def test_repository_object_and_run_lookups_use_exact_opaque_ids(
    tmp_path: Path,
) -> None:
    repository = build_repository(tmp_path / "evaluation.sqlite3")

    assert asyncio.run(repository.get_object("evaluation-ct6")) is not None
    assert asyncio.run(repository.get_object("Evaluation-ct6")) is None
    assert asyncio.run(repository.get_object(" evaluation-ct6 ")) is None
    assert asyncio.run(repository.get_run("eval-2026-071")) is not None
    assert asyncio.run(repository.get_run("Eval-2026-071")) is None
    assert asyncio.run(repository.get_run(" eval-2026-071 ")) is None


def test_repository_rejects_changed_immutable_run_payload_on_restart(
    tmp_path: Path,
) -> None:
    database_path = tmp_path / "evaluation.sqlite3"
    build_repository(database_path)
    with sqlite3.connect(database_path) as connection:
        connection.execute(
            """
            UPDATE evaluation_run_read_models
            SET payload = ?
            WHERE run_id = ?
            """,
            ("{}", "eval-2026-071"),
        )

    with pytest.raises(
        EvaluationReadModelConflictError,
        match="评价运行 eval-2026-071 的试点读模型已发生变化",
    ):
        build_repository(database_path)


def test_repository_rejects_changed_calculation_snapshot_on_restart(
    tmp_path: Path,
) -> None:
    database_path = tmp_path / "evaluation.sqlite3"
    build_repository(database_path)
    with sqlite3.connect(database_path) as connection:
        connection.execute(
            """
            UPDATE evaluation_run_calculation_snapshots
            SET payload = ?
            WHERE run_id = ?
            """,
            ("{}", "eval-2026-071"),
        )

    with pytest.raises(
        EvaluationReadModelConflictError,
        match="评价运行 eval-2026-071 的计算快照已发生变化",
    ):
        build_repository(database_path)


def test_repository_rejects_rebinding_a_historical_run(
    tmp_path: Path,
) -> None:
    database_path = tmp_path / "evaluation.sqlite3"
    with sqlite3.connect(database_path) as connection:
        connection.execute(
            """
            CREATE TABLE evaluation_run_references (
                run_id TEXT PRIMARY KEY,
                evaluation_object_id TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            INSERT INTO evaluation_run_references(
                run_id,
                evaluation_object_id
            ) VALUES (?, ?)
            """,
            ("eval-2026-071", "evaluation-ct3"),
        )

    with pytest.raises(
        EvaluationRunReferenceConflictError,
        match="已绑定其他评价对象",
    ):
        build_repository(database_path)


def test_multiple_runs_can_reference_the_same_evaluation_object(
    tmp_path: Path,
) -> None:
    repository = build_repository(tmp_path / "evaluation.sqlite3")
    reference_query = GetEvaluationRunReference(repository)
    run_query = GetEvaluationRun(repository)

    baseline_reference = asyncio.run(
        reference_query.run("eval-2026-071")
    )
    reevaluation_reference = asyncio.run(
        reference_query.run("eval-2026-072")
    )
    baseline = asyncio.run(run_query.run("eval-2026-071"))
    reevaluation = asyncio.run(run_query.run("eval-2026-072"))

    assert baseline_reference is not None
    assert reevaluation_reference is not None
    assert baseline_reference.evaluation_object_id == "evaluation-ct6"
    assert reevaluation_reference.evaluation_object_id == "evaluation-ct6"
    assert baseline is not None
    assert reevaluation is not None
    assert baseline.run.run_id == "eval-2026-071"
    assert reevaluation.run.run_id == "eval-2026-072"
    assert baseline.run.score_snapshot == "2026-05-12"
    assert reevaluation.run.score_snapshot == "2026-07-20"
    assert baseline.run.score_snapshot < reevaluation.run.score_snapshot
    assert baseline.run.input_snapshot != reevaluation.run.input_snapshot
    assert baseline.calculation.result is not None
    assert reevaluation.calculation.result is not None
    assert str(baseline.calculation.result.score) == "0.680"
    assert str(reevaluation.calculation.result.score) == "0.730"


def test_pilot_snapshots_match_the_frozen_evaluator_version(
    tmp_path: Path,
) -> None:
    repository = build_repository(tmp_path / "evaluation.sqlite3")

    snapshot = asyncio.run(repository.get_run("eval-2026-071"))

    assert snapshot is not None
    assert snapshot.run.program_version == "evaluator 0.8.0"
    assert snapshot.calculation == calculate_attainment(snapshot.run)


def test_list_uses_the_explicit_presented_run_without_duplicating_objects(
    tmp_path: Path,
) -> None:
    repository = build_repository(tmp_path / "evaluation.sqlite3")

    evaluated = asyncio.run(ListEvaluationObjects(repository).run())
    ct6_items = [
        item
        for item in evaluated
        if item.evaluation_object.evaluation_object_id == "evaluation-ct6"
    ]

    assert len(ct6_items) == 1
    assert ct6_items[0].run.run_id == "eval-2026-071"
    assert ct6_items[0].calculation.result is not None
    assert str(ct6_items[0].calculation.result.score) == "0.680"


def test_blocked_run_has_no_attainment_result(
    tmp_path: Path,
) -> None:
    repository = build_repository(tmp_path / "evaluation.sqlite3")

    evaluated = asyncio.run(
        GetEvaluationRun(repository).run("eval-2026-068")
    )

    assert evaluated is not None
    assert evaluated.calculation.ready is False
    assert evaluated.calculation.result is None
    assert evaluated.calculation.result is not False
    assert (
        "团队互评汇总缺少 6 名学生记录"
        in evaluated.calculation.blockers
    )
