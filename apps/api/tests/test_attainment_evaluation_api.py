from collections.abc import Iterator
from pathlib import Path

from app.core.config import get_settings
from app.factory import create_app
from app.modules.evaluations.application import (
    CreateEvaluationRun,
    GetEvaluationPreflight,
    GetEvaluationRun,
    GetEvaluationRunReference,
    ListEvaluationObjects,
)
from app.modules.evaluations.domain import (
    EvaluationObject,
    EvaluationRunReference,
    EvaluationRunSnapshot,
)
from app.modules.evaluations.routes import create_evaluations_router
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pytest import MonkeyPatch, fixture, mark


class EmptyEvaluationReadRepository:
    async def list_objects(self) -> tuple[EvaluationObject, ...]:
        return ()

    async def get_object(
        self,
        evaluation_object_id: str,
    ) -> EvaluationObject | None:
        return None

    async def get_run(
        self,
        run_id: str,
    ) -> EvaluationRunSnapshot | None:
        return None

    async def get_by_run_id(
        self,
        run_id: str,
    ) -> EvaluationRunReference | None:
        return None


def unused_create_evaluation_run() -> CreateEvaluationRun:
    raise AssertionError("空投影测试不应调用评价运行创建用例")


@fixture
def client(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
) -> Iterator[TestClient]:
    monkeypatch.setenv("EA_LOCAL_DATA_DIR", str(tmp_path))
    get_settings.cache_clear()
    with TestClient(create_app()) as test_client:
        yield test_client
    get_settings.cache_clear()


def test_evaluation_run_reference_is_exposed_through_public_api(
    client: TestClient,
) -> None:
    response = client.get(
        "/api/v1/evaluations/runs/eval-2026-071/reference"
    )

    assert response.status_code == 200
    assert response.json() == {
        "runId": "eval-2026-071",
        "evaluationObjectId": "evaluation-ct6",
    }


def test_unknown_evaluation_run_reference_returns_explicit_not_found(
    client: TestClient,
) -> None:
    response = client.get(
        "/api/v1/evaluations/runs/eval-unknown/reference"
    )

    assert response.status_code == 404
    assert response.json() == {
        "detail": {
            "code": "evaluation_run_not_found",
            "message": "未找到指定评价运行",
            "runId": "eval-unknown",
        }
    }


def test_evaluation_run_reference_does_not_normalize_opaque_ids(
    client: TestClient,
) -> None:
    response = client.get(
        "/api/v1/evaluations/runs/%20eval-2026-071%20/reference"
    )

    assert response.status_code == 404
    assert response.json()["detail"] == {
        "code": "evaluation_run_not_found",
        "message": "未找到指定评价运行",
        "runId": " eval-2026-071 ",
    }


def test_evaluation_run_reference_rejects_a_blank_id(
    client: TestClient,
) -> None:
    response = client.get(
        "/api/v1/evaluations/runs/%20%20/reference"
    )

    assert response.status_code == 422


def test_evaluation_object_list_exposes_stable_presented_run_summaries(
    client: TestClient,
) -> None:
    response = client.get("/api/v1/evaluations/objects")

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 6
    items = payload["items"]
    assert [item["objectiveCode"] for item in items] == [
        "CT-3",
        "CT-4",
        "CT-2",
        "CT-5",
        "CT-1",
        "CT-6",
    ]
    assert [item["evaluationObjectId"] for item in items] == [
        "evaluation-ct3",
        "evaluation-ct4",
        "evaluation-ct2",
        "evaluation-ct5",
        "evaluation-ct1",
        "evaluation-ct6",
    ]
    assert [item["presentedRunId"] for item in items] == [
        "eval-2026-066",
        "eval-2026-067",
        "eval-2026-069",
        "eval-2026-068",
        "eval-2026-070",
        "eval-2026-071",
    ]
    assert len({item["evaluationObjectId"] for item in items}) == payload[
        "total"
    ]
    assert len({item["presentedRunId"] for item in items}) == payload["total"]
    assert payload["items"][-1] == {
        "abilityCode": "BA-5",
        "abilityName": "工程规范与职业伦理",
        "approvalStatus": "pending",
        "course": "计算机网络",
        "evaluationObjectId": "evaluation-ct6",
        "objectiveCode": "CT-6",
        "objectiveName": "工程规范与伦理",
        "presentedRunId": "eval-2026-071",
        "readinessStatus": "ready",
        "result": {
            "outcome": "not_achieved",
            "score": 0.68,
        },
    }


def test_evaluation_run_detail_exposes_authoritative_calculation(
    client: TestClient,
) -> None:
    response = client.get(
        "/api/v1/evaluations/runs/eval-2026-071"
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["runId"] == "eval-2026-071"
    assert payload["evaluationObject"]["evaluationObjectId"] == (
        "evaluation-ct6"
    )
    assert payload["calculation"]["ready"] is True
    assert payload["calculation"]["result"] == {
        "outcome": "not_achieved",
        "score": 0.68,
    }
    assert payload["calculation"]["weightTotal"] == 1.0
    assert [
        contribution["value"]
        for contribution in payload["calculation"]["contributions"]
    ] == [0.42, 0.26]


def test_blocked_evaluation_run_never_exposes_a_result(
    client: TestClient,
) -> None:
    response = client.get(
        "/api/v1/evaluations/runs/eval-2026-068"
    )

    assert response.status_code == 200
    calculation = response.json()["calculation"]
    assert calculation["ready"] is False
    assert calculation["result"] is None
    assert "outcome" not in calculation
    assert "团队互评汇总缺少 6 名学生记录" in calculation[
        "blockers"
    ]

    object_list = client.get("/api/v1/evaluations/objects").json()
    blocked_summary = next(
        item
        for item in object_list["items"]
        if item["evaluationObjectId"] == "evaluation-ct5"
    )
    assert blocked_summary["readinessStatus"] == "blocked"
    assert blocked_summary["result"] is None


def test_evaluation_object_can_reference_multiple_immutable_runs(
    client: TestClient,
) -> None:
    object_list = client.get("/api/v1/evaluations/objects").json()

    baseline = client.get(
        "/api/v1/evaluations/runs/eval-2026-071"
    ).json()
    reevaluation = client.get(
        "/api/v1/evaluations/runs/eval-2026-072"
    ).json()

    assert sum(
        item["evaluationObjectId"] == "evaluation-ct6"
        for item in object_list["items"]
    ) == 1
    assert baseline["evaluationObject"]["evaluationObjectId"] == (
        "evaluation-ct6"
    )
    assert reevaluation["evaluationObject"]["evaluationObjectId"] == (
        "evaluation-ct6"
    )
    assert baseline["calculation"]["result"]["score"] == 0.68
    assert reevaluation["calculation"]["result"]["score"] == 0.73
    assert baseline["runId"] == "eval-2026-071"
    assert reevaluation["runId"] == "eval-2026-072"
    assert baseline["scoreSnapshot"] == "2026-05-12"
    assert reevaluation["scoreSnapshot"] == "2026-07-20"
    assert baseline["scoreSnapshot"] < reevaluation["scoreSnapshot"]
    assert baseline["inputSnapshot"] != reevaluation["inputSnapshot"]
    assert baseline["graphVersion"] == "图谱 v0.3"
    assert reevaluation["graphVersion"] == "图谱 v0.4"
    assert [item["scoreRate"] for item in baseline["inputs"]] == [0.7, 0.65]
    assert [item["scoreRate"] for item in reevaluation["inputs"]] == [
        0.75,
        0.7,
    ]
    assert client.get(
        "/api/v1/evaluations/runs/eval-2026-071"
    ).json() == baseline
    assert object_list["items"][-1]["presentedRunId"] == (
        "eval-2026-071"
    )


def test_unknown_evaluation_run_detail_returns_explicit_not_found(
    client: TestClient,
) -> None:
    response = client.get(
        "/api/v1/evaluations/runs/eval-unknown"
    )

    assert response.status_code == 404
    assert response.json() == {
        "detail": {
            "code": "evaluation_run_not_found",
            "message": "未找到指定评价运行",
            "runId": "eval-unknown",
        }
    }


@mark.parametrize(
    ("encoded_run_id", "decoded_run_id"),
    [
        ("%20eval-2026-071%20", " eval-2026-071 "),
        ("Eval-2026-071", "Eval-2026-071"),
    ],
)
def test_evaluation_run_detail_uses_case_sensitive_opaque_ids(
    client: TestClient,
    encoded_run_id: str,
    decoded_run_id: str,
) -> None:
    response = client.get(
        f"/api/v1/evaluations/runs/{encoded_run_id}"
    )

    assert response.status_code == 404
    assert response.json()["detail"] == {
        "code": "evaluation_run_not_found",
        "message": "未找到指定评价运行",
        "runId": decoded_run_id,
    }


def test_evaluation_run_detail_rejects_a_blank_id(
    client: TestClient,
) -> None:
    response = client.get("/api/v1/evaluations/runs/%20%20")

    assert response.status_code == 422


def test_evaluation_object_list_allows_an_empty_projection() -> None:
    repository = EmptyEvaluationReadRepository()
    application = FastAPI()
    application.include_router(
        create_evaluations_router(
            provide_list_objects=lambda: ListEvaluationObjects(repository),
            provide_get_run=lambda: GetEvaluationRun(repository),
            provide_get_reference=lambda: GetEvaluationRunReference(
                repository
            ),
            provide_get_preflight=lambda: GetEvaluationPreflight(repository),
            provide_create_run=unused_create_evaluation_run,
        ),
        prefix="/api/v1",
    )

    with TestClient(application) as empty_client:
        response = empty_client.get("/api/v1/evaluations/objects")

    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0}


def test_openapi_contains_evaluation_run_reference_contract(
    client: TestClient,
) -> None:
    response = client.get("/api/openapi.json")

    assert response.status_code == 200
    specification = response.json()
    route = (
        "/api/v1/evaluations/runs/{run_id}/reference"
    )
    assert route in specification["paths"]
    assert (
        specification["paths"][route]["get"]["responses"]["200"]["content"][
            "application/json"
        ]["schema"]["$ref"]
        == "#/components/schemas/EvaluationRunReferenceResponse"
    )
    assert (
        specification["paths"][route]["get"]["responses"]["404"]["content"][
            "application/json"
        ]["schema"]["$ref"]
        == "#/components/schemas/EvaluationRunReferenceNotFoundResponse"
    )
    not_found_code = specification["components"]["schemas"][
        "EvaluationRunReferenceNotFoundDetail"
    ]["properties"]["code"]
    assert not_found_code["const"] == "evaluation_run_not_found"
    object_list_responses = specification["paths"][
        "/api/v1/evaluations/objects"
    ]["get"]["responses"]
    assert object_list_responses["200"]["content"]["application/json"][
        "schema"
    ]["$ref"] == "#/components/schemas/EvaluationObjectListResponse"

    run_responses = specification["paths"][
        "/api/v1/evaluations/runs/{run_id}"
    ]["get"]["responses"]
    assert run_responses["200"]["content"]["application/json"]["schema"][
        "$ref"
    ] == "#/components/schemas/EvaluationRunDetailResponse"
    assert run_responses["404"]["content"]["application/json"]["schema"][
        "$ref"
    ] == (
        "#/components/schemas/EvaluationRunReferenceNotFoundResponse"
    )
    preflight_responses = specification["paths"][
        "/api/v1/evaluations/runs/{run_id}/preflight"
    ]["get"]["responses"]
    assert preflight_responses["200"]["content"]["application/json"][
        "schema"
    ]["$ref"] == "#/components/schemas/EvaluationPreflightResponse"
    assert preflight_responses["404"]["content"]["application/json"][
        "schema"
    ]["$ref"] == (
        "#/components/schemas/EvaluationRunReferenceNotFoundResponse"
    )
    create_operation = specification["paths"][
        "/api/v1/evaluations/runs"
    ]["post"]
    assert create_operation["requestBody"]["content"][
        "application/json"
    ]["schema"]["$ref"] == "#/components/schemas/CreateEvaluationRunRequest"
    assert create_operation["responses"]["201"]["content"][
        "application/json"
    ]["schema"]["$ref"] == (
        "#/components/schemas/EvaluationRunCreationResponse"
    )
    assert create_operation["responses"]["201"]["headers"][
        "Location"
    ]["schema"] == {"type": "string", "format": "uri"}
    idempotency_header = create_operation["parameters"][0]
    assert idempotency_header["name"] == "Idempotency-Key"
    assert idempotency_header["in"] == "header"
    assert idempotency_header["required"] is True
    schemas = specification["components"]["schemas"]
    expected_approval_statuses = {
        "not_submitted",
        "pending",
        "approved",
        "rejected",
    }
    assert set(
        schemas["EvaluationObjectSummaryResponse"]["properties"][
            "approvalStatus"
        ]["enum"]
    ) == expected_approval_statuses
    assert set(
        schemas["EvaluationRunDetailResponse"]["properties"][
            "approvalStatus"
        ]["enum"]
    ) == expected_approval_statuses
