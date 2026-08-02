import asyncio
import re
import sqlite3
from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from app.core.config import get_settings
from app.factory import create_app
from app.modules.evaluations.application import (
    CreateEvaluationRun,
    CreateEvaluationRunCommand,
)
from app.modules.evaluations.infra import (
    DeterministicEvaluationRunEvaluator,
    build_local_evaluation_read_repository_at,
)
from fastapi.testclient import TestClient
from pytest import MonkeyPatch, fixture, raises


@fixture
def client_and_data_dir(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
) -> Iterator[tuple[TestClient, Path]]:
    monkeypatch.setenv("EA_LOCAL_DATA_DIR", str(tmp_path))
    get_settings.cache_clear()
    with TestClient(create_app()) as test_client:
        yield test_client, tmp_path
    get_settings.cache_clear()


def create_run(
    client: TestClient,
    *,
    key: str,
    evaluation_object_id: str = "evaluation-ct6",
    source_run_id: str = "eval-2026-071",
):
    return client.post(
        "/api/v1/evaluations/runs",
        headers={"Idempotency-Key": key},
        json={
            "evaluationObjectId": evaluation_object_id,
            "sourceRunId": source_run_id,
        },
    )


def test_create_run_persists_an_immutable_snapshot_without_changing_queue_focus(
    client_and_data_dir: tuple[TestClient, Path],
) -> None:
    client, _ = client_and_data_dir
    source_before = client.get(
        "/api/v1/evaluations/runs/eval-2026-071"
    ).json()

    response = create_run(client, key="m6-run:create-071")

    assert response.status_code == 201
    payload = response.json()
    assert payload["idempotentReplay"] is False
    assert payload["sourceRunId"] == "eval-2026-071"
    run = payload["run"]
    assert response.headers["Location"].endswith(
        f"/api/v1/evaluations/runs/{run['runId']}"
    )
    assert run["sourceRunId"] == "eval-2026-071"
    assert run["runId"] != "eval-2026-071"
    assert run["runId"].startswith("eval-")
    assert run["approvalStatus"] == "not_submitted"
    assert run["graphVersion"] == source_before["graphVersion"]
    assert run["policyVersion"] == source_before["policyVersion"]
    assert run["programVersion"] == source_before["programVersion"]
    assert run["scoreSnapshot"] == source_before["scoreSnapshot"]
    assert run["inputs"] == source_before["inputs"]
    assert run["calculation"] == source_before["calculation"]
    assert re.fullmatch(
        r"sha256:[a-f0-9]{64}",
        run["inputSnapshot"]["hash"],
    )

    assert client.get(
        f"/api/v1/evaluations/runs/{run['runId']}"
    ).json() == run
    assert client.get(
        f"/api/v1/evaluations/runs/{run['runId']}/reference"
    ).json() == {
        "runId": run["runId"],
        "evaluationObjectId": "evaluation-ct6",
    }
    objects = client.get("/api/v1/evaluations/objects").json()["items"]
    ct6 = next(
        item
        for item in objects
        if item["evaluationObjectId"] == "evaluation-ct6"
    )
    assert ct6["presentedRunId"] == "eval-2026-071"
    assert ct6["approvalStatus"] == "pending"
    assert client.get(
        "/api/v1/evaluations/runs/eval-2026-071"
    ).json() == source_before


def test_create_run_replays_the_same_idempotent_request_without_duplicates(
    client_and_data_dir: tuple[TestClient, Path],
) -> None:
    client, data_dir = client_and_data_dir

    first = create_run(client, key="m6-run:stable-retry")
    replay = create_run(client, key="m6-run:stable-retry")

    assert first.status_code == 201
    assert replay.status_code == 201
    assert replay.json()["idempotentReplay"] is True
    assert replay.json()["run"] == first.json()["run"]
    with sqlite3.connect(
        data_dir / "evaluation-read-model.sqlite3"
    ) as connection:
        assert connection.execute(
            "SELECT COUNT(*) FROM evaluation_run_commands"
        ).fetchone() == (1,)
        assert connection.execute(
            "SELECT COUNT(*) FROM evaluation_run_read_models"
        ).fetchone() == (8,)
        assert connection.execute(
            "SELECT run_id, source_run_id FROM evaluation_run_lineage"
        ).fetchone() == (
            first.json()["run"]["runId"],
            "eval-2026-071",
        )


def test_idempotency_key_cannot_be_reused_for_another_request(
    client_and_data_dir: tuple[TestClient, Path],
) -> None:
    client, _ = client_and_data_dir
    assert create_run(client, key="m6-run:one-purpose").status_code == 201

    conflict = create_run(
        client,
        key="m6-run:one-purpose",
        evaluation_object_id="evaluation-ct3",
        source_run_id="eval-2026-066",
    )

    assert conflict.status_code == 409
    assert conflict.json()["detail"]["code"] == (
        "evaluation_run_idempotency_conflict"
    )


def test_blocked_source_cannot_create_a_pilot_rerun(
    client_and_data_dir: tuple[TestClient, Path],
) -> None:
    client, _ = client_and_data_dir

    response = create_run(
        client,
        key="m6-run:blocked-source",
        evaluation_object_id="evaluation-ct5",
        source_run_id="eval-2026-068",
    )

    assert response.status_code == 409
    assert response.json()["detail"] == {
        "code": "evaluation_source_run_not_ready",
        "message": "来源运行的评价输入尚未就绪",
        "sourceRunId": "eval-2026-068",
        "blockers": [
            "团队互评汇总缺少 6 名学生记录",
            "团队协作缺少有效得分率",
        ],
    }
    objects = client.get("/api/v1/evaluations/objects").json()["items"]
    ct5 = next(
        item
        for item in objects
        if item["evaluationObjectId"] == "evaluation-ct5"
    )
    assert ct5["presentedRunId"] == "eval-2026-068"


def test_source_run_must_belong_to_the_requested_object(
    client_and_data_dir: tuple[TestClient, Path],
) -> None:
    client, _ = client_and_data_dir

    response = create_run(
        client,
        key="m6-run:mismatched-source",
        evaluation_object_id="evaluation-ct3",
        source_run_id="eval-2026-071",
    )

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == (
        "evaluation_source_run_mismatch"
    )


def test_create_run_uses_the_exact_non_presented_source(
    client_and_data_dir: tuple[TestClient, Path],
) -> None:
    client, _ = client_and_data_dir

    response = create_run(
        client,
        key="m6-run:from-072",
        source_run_id="eval-2026-072",
    )

    assert response.status_code == 201
    run = response.json()["run"]
    assert run["graphVersion"] == "图谱 v0.4"
    assert run["scoreSnapshot"] == "2026-07-20"
    assert run["calculation"]["result"]["score"] == 0.73


def test_create_run_validates_missing_resources_and_opaque_inputs(
    client_and_data_dir: tuple[TestClient, Path],
) -> None:
    client, _ = client_and_data_dir

    missing_object = create_run(
        client,
        key="m6-run:missing-object",
        evaluation_object_id="evaluation-missing",
    )
    missing_source = create_run(
        client,
        key="m6-run:missing-source",
        source_run_id="eval-missing",
    )
    decorated_id = create_run(
        client,
        key="m6-run:decorated-id",
        source_run_id=" eval-2026-071 ",
    )
    invalid_key = create_run(client, key="bad key")

    assert missing_object.status_code == 404
    assert missing_object.json()["detail"]["code"] == (
        "evaluation_object_not_found"
    )
    assert missing_source.status_code == 404
    assert missing_source.json()["detail"]["code"] == (
        "evaluation_source_run_not_found"
    )
    assert decorated_id.status_code == 422
    assert invalid_key.status_code == 422


def test_created_run_survives_restart_without_changing_queue_focus(
    client_and_data_dir: tuple[TestClient, Path],
    monkeypatch: MonkeyPatch,
) -> None:
    client, data_dir = client_and_data_dir
    created = create_run(client, key="m6-run:survive-restart").json()["run"]

    monkeypatch.setenv("EA_LOCAL_DATA_DIR", str(data_dir))
    get_settings.cache_clear()
    with TestClient(create_app()) as reopened:
        assert reopened.get(
            f"/api/v1/evaluations/runs/{created['runId']}"
        ).json() == created
        objects = reopened.get("/api/v1/evaluations/objects").json()["items"]
        ct6 = next(
            item
            for item in objects
            if item["evaluationObjectId"] == "evaluation-ct6"
        )
        assert ct6["presentedRunId"] == "eval-2026-071"
        replay = create_run(
            reopened,
            key="m6-run:survive-restart",
        )
        assert replay.status_code == 201
        assert replay.json()["idempotentReplay"] is True
        assert replay.json()["run"] == created
    get_settings.cache_clear()


def test_concurrent_retries_commit_only_one_run(
    client_and_data_dir: tuple[TestClient, Path],
) -> None:
    client, data_dir = client_and_data_dir

    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = list(
            executor.map(
                lambda _: create_run(
                    client,
                    key="m6-run:concurrent-retry",
                ),
                range(2),
            )
        )

    assert [response.status_code for response in responses] == [201, 201]
    assert {
        response.json()["run"]["runId"] for response in responses
    } == {responses[0].json()["run"]["runId"]}
    assert sorted(
        response.json()["idempotentReplay"] for response in responses
    ) == [False, True]
    with sqlite3.connect(
        data_dir / "evaluation-read-model.sqlite3"
    ) as connection:
        assert connection.execute(
            "SELECT COUNT(*) FROM evaluation_run_commands"
        ).fetchone() == (1,)
        assert connection.execute(
            "SELECT COUNT(*) FROM evaluation_run_lineage"
        ).fetchone() == (1,)


def test_failed_transaction_rolls_back_and_the_same_intent_can_retry(
    client_and_data_dir: tuple[TestClient, Path],
) -> None:
    client, data_dir = client_and_data_dir
    database_path = data_dir / "evaluation-read-model.sqlite3"
    with sqlite3.connect(database_path) as connection:
        connection.execute(
            """
            CREATE TRIGGER fail_evaluation_lineage
            BEFORE INSERT ON evaluation_run_lineage
            BEGIN
                SELECT RAISE(ABORT, 'injected lineage failure');
            END
            """
        )

    with raises(sqlite3.IntegrityError, match="injected lineage failure"):
        create_run(client, key="m6-run:transaction-retry")

    with sqlite3.connect(database_path) as connection:
        assert connection.execute(
            "SELECT COUNT(*) FROM evaluation_run_read_models"
        ).fetchone() == (7,)
        assert connection.execute(
            "SELECT COUNT(*) FROM evaluation_run_commands"
        ).fetchone() == (0,)
        connection.execute("DROP TRIGGER fail_evaluation_lineage")

    retry = create_run(client, key="m6-run:transaction-retry")
    assert retry.status_code == 201
    assert retry.json()["idempotentReplay"] is False


def test_idempotent_replay_skips_clock_id_generation_and_recalculation(
    client_and_data_dir: tuple[TestClient, Path],
) -> None:
    client, data_dir = client_and_data_dir
    created = create_run(client, key="m6-run:early-replay").json()["run"]
    repository = build_local_evaluation_read_repository_at(
        data_dir / "evaluation-read-model.sqlite3"
    )

    class ExplodingClock:
        def now(self) -> str:
            raise AssertionError("幂等重放不应读取时钟")

    class ExplodingIdGenerator:
        def next(self) -> str:
            raise AssertionError("幂等重放不应生成新 ID")

    class ExplodingEvaluator:
        def create(self, *args: object, **kwargs: object):
            raise AssertionError("幂等重放不应重新计算")

    use_case = CreateEvaluationRun(
        repository,
        repository,
        ExplodingClock(),
        ExplodingIdGenerator(),
        ExplodingEvaluator(),
    )
    replay = asyncio.run(
        use_case.run(
            CreateEvaluationRunCommand(
                evaluation_object_id="evaluation-ct6",
                source_run_id="eval-2026-071",
                idempotency_key="m6-run:early-replay",
            )
        )
    )

    assert replay.idempotent_replay is True
    assert replay.evaluated.run.run_id == created["runId"]


def test_server_evaluator_version_does_not_change_the_input_digest(
    tmp_path: Path,
) -> None:
    repository = build_local_evaluation_read_repository_at(
        tmp_path / "evaluation.sqlite3"
    )
    source = asyncio.run(repository.get_run("eval-2026-071"))
    assert source is not None

    first = DeterministicEvaluationRunEvaluator("evaluator 0.8.0").create(
        source,
        run_id="eval-first",
        created_at="2026-08-01T08:00:00Z",
    )
    upgraded = DeterministicEvaluationRunEvaluator("evaluator 0.9.0").create(
        source,
        run_id="eval-second",
        created_at="2026-08-02T08:00:00Z",
    )

    assert first.run.program_version == "evaluator 0.8.0"
    assert upgraded.run.program_version == "evaluator 0.9.0"
    assert first.run.input_snapshot.digest == upgraded.run.input_snapshot.digest
