import sqlite3
from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from app.core.config import get_settings
from app.factory import create_app
from app.modules.evaluations.infra import ScoreImportRepositorySchemaError
from app.modules.evaluations.routes import create_evaluations_router
from fastapi.testclient import TestClient
from pytest import MonkeyPatch, fixture, mark, raises

SCORE_BATCH_PATH = "/api/v1/evaluations/score-import-batches"
READY_ITEMS = [
    {
        "inputId": "input-teamwork",
        "earnedPointsTotal": "2664",
        "possiblePointsTotal": "3600",
        "observedStudentCount": 36,
    },
    {
        "inputId": "input-communication",
        "earnedPointsTotal": "2844",
        "possiblePointsTotal": "3600",
        "observedStudentCount": 36,
    },
]


def request_payload(*, items: list[dict[str, object]] | None = None) -> dict[str, object]:
    return {
        "evaluationObjectId": "evaluation-ct5",
        "baseRunId": "eval-2026-068",
        "profile": "local-pilot-aggregate:v1",
        "items": READY_ITEMS if items is None else items,
    }


def post_batch(
    client: TestClient,
    *,
    key: str,
    payload: dict[str, object] | None = None,
):
    return client.post(
        SCORE_BATCH_PATH,
        headers={"Idempotency-Key": key},
        json=request_payload() if payload is None else payload,
    )


@fixture
def enabled_client(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
) -> Iterator[tuple[TestClient, Path]]:
    monkeypatch.setenv("EA_LOCAL_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("EA_ENVIRONMENT", "test")
    monkeypatch.setenv("EA_ENABLE_PILOT_SCORE_BATCH_CAPTURE", "true")
    get_settings.cache_clear()
    with TestClient(create_app()) as client:
        yield client, tmp_path
    get_settings.cache_clear()


def test_capture_is_disabled_by_default_and_in_production(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
) -> None:
    for environment, flag in (
        ("development", "false"),
        ("staging", "true"),
        ("production", "true"),
    ):
        data_dir = tmp_path / environment
        monkeypatch.setenv("EA_LOCAL_DATA_DIR", str(data_dir))
        monkeypatch.setenv("EA_ENVIRONMENT", environment)
        monkeypatch.setenv("EA_ENABLE_PILOT_SCORE_BATCH_CAPTURE", flag)
        get_settings.cache_clear()
        with TestClient(create_app()) as client:
            response = post_batch(client, key=f"score:{environment}:disabled")
            assert response.status_code == 503
            assert response.json()["detail"]["code"] == (
                "pilot_score_batch_capture_disabled"
            )
        with sqlite3.connect(data_dir / "evaluation-read-model.sqlite3") as connection:
            assert connection.execute(
                "SELECT COUNT(*) FROM evaluation_score_import_batches"
            ).fetchone() == (0,)
    get_settings.cache_clear()


def test_score_batch_router_providers_must_be_configured_as_a_pair() -> None:
    def dependency() -> None:
        return None

    with raises(ValueError, match="必须成对提供"):
        create_evaluations_router(
            provide_list_objects=dependency,  # type: ignore[arg-type]
            provide_get_run=dependency,  # type: ignore[arg-type]
            provide_get_reference=dependency,  # type: ignore[arg-type]
            provide_get_preflight=dependency,  # type: ignore[arg-type]
            provide_create_run=dependency,  # type: ignore[arg-type]
            provide_create_score_batch=dependency,  # type: ignore[arg-type]
        )


def test_ready_batch_is_immutable_and_does_not_change_its_base_run(
    enabled_client: tuple[TestClient, Path],
) -> None:
    client, data_dir = enabled_client
    run_path = "/api/v1/evaluations/runs/eval-2026-068"
    base_run = client.get(run_path).json()
    base_preflight = client.get(f"{run_path}/preflight").json()
    object_queue = client.get("/api/v1/evaluations/objects").json()

    response = post_batch(client, key="score:ready:001")

    assert response.status_code == 201
    batch = response.json()["batch"]
    assert response.headers["Location"].endswith(
        f"{SCORE_BATCH_PATH}/{batch['batchId']}"
    )
    assert batch["scope"] == "local_pilot_aggregate"
    assert batch["recordGranularity"] == "aggregate"
    assert batch["formalUsable"] is False
    assert batch["validationReport"]["validationStatus"] == "pilot_ready"
    assert {record["scoreRate"] for record in batch["records"]} == {"0.74", "0.79"}
    assert client.get(response.headers["Location"]).json() == batch
    assert client.get(run_path).json() == base_run
    assert client.get(f"{run_path}/preflight").json() == base_preflight
    assert client.get("/api/v1/evaluations/objects").json() == object_queue
    assert client.get(SCORE_BATCH_PATH).status_code == 405
    assert client.patch(response.headers["Location"], json={}).status_code == 405
    assert client.delete(response.headers["Location"]).status_code == 405

    database_path = data_dir / "evaluation-read-model.sqlite3"
    with sqlite3.connect(database_path) as connection:
        assert connection.execute(
            "SELECT COUNT(*) FROM evaluation_score_import_batches"
        ).fetchone() == (1,)
        assert connection.execute(
            "SELECT COUNT(*) FROM evaluation_score_import_candidate_items"
        ).fetchone() == (2,)
        assert connection.execute(
            "SELECT COUNT(*) FROM evaluation_score_records"
        ).fetchone() == (2,)
        assert connection.execute(
            "SELECT COUNT(*) FROM evaluation_score_validation_reports"
        ).fetchone() == (1,)
        assert connection.execute(
            "SELECT COUNT(*) FROM evaluation_score_import_commands"
        ).fetchone() == (1,)
        with raises(sqlite3.IntegrityError, match="immutable score import data"):
            connection.execute(
                "UPDATE evaluation_score_records SET score_rate = '0'"
            )


def test_invalid_complete_replacement_is_captured_as_blocked_without_records(
    enabled_client: tuple[TestClient, Path],
) -> None:
    client, data_dir = enabled_client

    response = post_batch(
        client,
        key="score:blocked:001",
        payload=request_payload(items=[READY_ITEMS[0]]),
    )

    assert response.status_code == 201
    batch = response.json()["batch"]
    assert batch["validationReport"]["validationStatus"] == "blocked"
    assert batch["records"] == []
    coverage = next(
        check
        for check in batch["validationReport"]["checks"]
        if check["code"] == "score_input.coverage"
    )
    assert coverage["affectedInputIds"] == ["input-communication"]
    with sqlite3.connect(
        data_dir / "evaluation-read-model.sqlite3"
    ) as connection:
        assert connection.execute(
            "SELECT COUNT(*) FROM evaluation_score_records"
        ).fetchone() == (0,)


@mark.parametrize(
    ("case_name", "items", "blocked_code"),
    [
        (
            "duplicate",
            [READY_ITEMS[0], READY_ITEMS[0], READY_ITEMS[1]],
            "score_input.duplicates",
        ),
        (
            "unknown",
            [
                READY_ITEMS[0],
                READY_ITEMS[1],
                {**READY_ITEMS[1], "inputId": "input-unknown"},
            ],
            "score_input.unknown",
        ),
        (
            "range",
            [
                {**READY_ITEMS[0], "earnedPointsTotal": "4000"},
                READY_ITEMS[1],
            ],
            "score_input.points_range",
        ),
        (
            "sample-scope",
            [
                {**READY_ITEMS[0], "observedStudentCount": 35},
                READY_ITEMS[1],
            ],
            "score_input.sample_scope",
        ),
    ],
)
def test_semantic_validation_blocks_the_entire_batch_without_partial_records(
    enabled_client: tuple[TestClient, Path],
    case_name: str,
    items: list[dict[str, object]],
    blocked_code: str,
) -> None:
    client, data_dir = enabled_client

    response = post_batch(
        client,
        key=f"score:blocked:{case_name}",
        payload=request_payload(items=items),
    )

    assert response.status_code == 201
    batch = response.json()["batch"]
    assert batch["records"] == []
    blocked_codes = {
        check["code"]
        for check in batch["validationReport"]["checks"]
        if check["status"] == "blocked"
    }
    assert blocked_code in blocked_codes
    with sqlite3.connect(
        data_dir / "evaluation-read-model.sqlite3"
    ) as connection:
        assert connection.execute(
            "SELECT COUNT(*) FROM evaluation_score_records"
        ).fetchone() == (0,)


def test_request_rejects_numbers_and_student_level_or_unknown_fields(
    enabled_client: tuple[TestClient, Path],
) -> None:
    client, _ = enabled_client
    numeric = request_payload(items=[dict(READY_ITEMS[0]), dict(READY_ITEMS[1])])
    numeric_items = numeric["items"]
    assert isinstance(numeric_items, list)
    numeric_items[0]["earnedPointsTotal"] = 2664
    student_data = request_payload(items=[dict(READY_ITEMS[0]), dict(READY_ITEMS[1])])
    student_items = student_data["items"]
    assert isinstance(student_items, list)
    student_items[0]["studentId"] = "student-001"

    assert post_batch(client, key="score:numeric", payload=numeric).status_code == 422
    assert post_batch(client, key="score:pii", payload=student_data).status_code == 422
    assert client.post(
        SCORE_BATCH_PATH,
        headers={"Idempotency-Key": "score:extra-field"},
        json={**request_payload(), "fileName": "scores.xlsx"},
    ).status_code == 422


@mark.parametrize(
    ("field", "invalid_value"),
    [
        ("earnedPointsTotal", "2664.0"),
        ("possiblePointsTotal", "3.6E3"),
        ("observedStudentCount", True),
        ("observedStudentCount", -1),
        ("observedStudentCount", 9_223_372_036_854_775_808),
    ],
)
def test_request_requires_canonical_decimals_and_strict_integer_types(
    enabled_client: tuple[TestClient, Path],
    field: str,
    invalid_value: object,
) -> None:
    client, _ = enabled_client
    items = [dict(READY_ITEMS[0]), dict(READY_ITEMS[1])]
    items[0][field] = invalid_value

    response = post_batch(
        client,
        key=f"score:invalid:{field}",
        payload=request_payload(items=items),
    )

    assert response.status_code == 422


def test_request_requires_an_idempotency_key(
    enabled_client: tuple[TestClient, Path],
) -> None:
    client, _ = enabled_client

    assert client.post(SCORE_BATCH_PATH, json=request_payload()).status_code == 422


def test_only_a_matching_run_with_a_score_data_blocker_is_eligible(
    enabled_client: tuple[TestClient, Path],
) -> None:
    client, _ = enabled_client
    ready = {
        **request_payload(),
        "evaluationObjectId": "evaluation-ct6",
        "baseRunId": "eval-2026-071",
    }
    mismatch = {**request_payload(), "evaluationObjectId": "evaluation-ct3"}

    ready_response = post_batch(client, key="score:ready-run", payload=ready)
    mismatch_response = post_batch(client, key="score:mismatch", payload=mismatch)

    assert ready_response.status_code == 409
    assert ready_response.json()["detail"]["code"] == (
        "score_import_base_run_does_not_need_score_data"
    )
    assert mismatch_response.status_code == 409
    assert mismatch_response.json()["detail"]["code"] == (
        "score_import_base_run_mismatch"
    )


def test_idempotency_is_order_independent_and_detects_reuse(
    enabled_client: tuple[TestClient, Path],
) -> None:
    client, _ = enabled_client
    first = post_batch(client, key="score:idempotent")
    replay = post_batch(
        client,
        key="score:idempotent",
        payload=request_payload(items=list(reversed(READY_ITEMS))),
    )
    changed_items = [dict(READY_ITEMS[0]), dict(READY_ITEMS[1])]
    changed_items[0]["earnedPointsTotal"] = "2600"
    conflict = post_batch(
        client,
        key="score:idempotent",
        payload=request_payload(items=changed_items),
    )

    assert first.status_code == 201
    assert replay.status_code == 201
    assert replay.json()["idempotentReplay"] is True
    assert replay.json()["batch"] == first.json()["batch"]
    assert conflict.status_code == 409
    assert conflict.json()["detail"]["code"] == "score_import_idempotency_conflict"


def test_concurrent_retries_commit_only_one_batch(
    enabled_client: tuple[TestClient, Path],
) -> None:
    client, data_dir = enabled_client

    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = list(
            executor.map(
                lambda _: post_batch(client, key="score:concurrent"),
                range(2),
            )
        )

    assert [response.status_code for response in responses] == [201, 201]
    assert {response.json()["batch"]["batchId"] for response in responses} == {
        responses[0].json()["batch"]["batchId"]
    }
    assert sorted(response.json()["idempotentReplay"] for response in responses) == [
        False,
        True,
    ]
    with sqlite3.connect(
        data_dir / "evaluation-read-model.sqlite3"
    ) as connection:
        assert connection.execute(
            "SELECT COUNT(*) FROM evaluation_score_import_batches"
        ).fetchone() == (1,)
        assert connection.execute(
            "SELECT COUNT(*) FROM evaluation_score_import_commands"
        ).fetchone() == (1,)


def test_created_batch_survives_an_application_restart(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
) -> None:
    monkeypatch.setenv("EA_LOCAL_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("EA_ENVIRONMENT", "test")
    monkeypatch.setenv("EA_ENABLE_PILOT_SCORE_BATCH_CAPTURE", "true")
    get_settings.cache_clear()
    with TestClient(create_app()) as client:
        created = post_batch(client, key="score:restart").json()["batch"]
    get_settings.cache_clear()
    with TestClient(create_app()) as reopened:
        response = reopened.get(f"{SCORE_BATCH_PATH}/{created['batchId']}")
        replay = post_batch(reopened, key="score:restart")
    get_settings.cache_clear()

    assert response.status_code == 200
    assert response.json() == created
    assert replay.status_code == 201
    assert replay.json() == {"idempotentReplay": True, "batch": created}


def test_candidate_digest_tampering_is_detected_on_read(
    enabled_client: tuple[TestClient, Path],
) -> None:
    client, data_dir = enabled_client
    created = post_batch(client, key="score:tamper").json()["batch"]
    database_path = data_dir / "evaluation-read-model.sqlite3"
    with sqlite3.connect(database_path) as connection:
        connection.execute(
            "DROP TRIGGER prevent_evaluation_score_import_candidate_items_update"
        )
        connection.execute(
            """
            UPDATE evaluation_score_import_candidate_items
            SET earned_points_total = '1'
            WHERE batch_id = ? AND input_id = 'input-teamwork'
            """,
            (created["batchId"],),
        )

    with raises(ScoreImportRepositorySchemaError, match="内容摘要不一致"):
        client.get(f"{SCORE_BATCH_PATH}/{created['batchId']}")


def test_transaction_rolls_back_all_rows_when_report_insert_fails(
    enabled_client: tuple[TestClient, Path],
) -> None:
    client, data_dir = enabled_client
    database_path = data_dir / "evaluation-read-model.sqlite3"
    with sqlite3.connect(database_path) as connection:
        connection.execute(
            """
            CREATE TRIGGER reject_score_import_report
            BEFORE INSERT ON evaluation_score_validation_reports
            BEGIN SELECT RAISE(ABORT, 'injected report failure'); END
            """
        )

    with raises(sqlite3.IntegrityError, match="injected report failure"):
        post_batch(client, key="score:rollback")

    with sqlite3.connect(database_path) as connection:
        for table in (
            "evaluation_score_import_batches",
            "evaluation_score_import_candidate_items",
            "evaluation_score_records",
            "evaluation_score_validation_reports",
            "evaluation_score_import_commands",
        ):
            assert connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone() == (0,)


def test_runtime_openapi_exposes_the_fixed_pilot_contract(
    enabled_client: tuple[TestClient, Path],
) -> None:
    client, _ = enabled_client
    schema = client.app.openapi()
    path = schema["paths"][SCORE_BATCH_PATH]

    assert set(path) == {"post"}
    assert "Location" in path["post"]["responses"]["201"]["headers"]
    detail_path = f"{SCORE_BATCH_PATH}/{{batch_id}}"
    assert set(schema["paths"][detail_path]) == {"get"}
    batch_schema = schema["components"]["schemas"]["ScoreImportBatchResponse"]
    assert batch_schema["properties"]["formalUsable"]["const"] is False
    assert batch_schema["properties"]["recordGranularity"]["const"] == "aggregate"
    request_schema = schema["components"]["schemas"]["CreateScoreImportBatchRequest"]
    assert request_schema["additionalProperties"] is False
