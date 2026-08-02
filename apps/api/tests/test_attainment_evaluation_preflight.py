from collections.abc import Iterator
from dataclasses import replace
from decimal import Decimal
from pathlib import Path

from app.core.config import get_settings
from app.factory import create_app
from app.modules.evaluations.domain import (
    EvaluationRunSnapshot,
    build_evaluation_preflight_report,
    calculate_attainment,
)
from app.modules.evaluations.infra.pilot_seed import load_pilot_evaluation_seed
from fastapi.testclient import TestClient
from pytest import MonkeyPatch, fixture, mark


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


def test_ready_run_exposes_a_deterministic_navigation_report(
    client: TestClient,
) -> None:
    response = client.get(
        "/api/v1/evaluations/runs/eval-2026-071/preflight"
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload == client.get(
        "/api/v1/evaluations/runs/eval-2026-071/preflight"
    ).json()
    assert payload["scope"] == "pilot_snapshot"
    assert payload["reportVersion"] == "evaluation-preflight:v1"
    assert payload["runId"] == "eval-2026-071"
    assert payload["evaluationObjectId"] == "evaluation-ct6"
    assert payload["status"] == "ready"
    assert payload["blockers"] == []
    assert payload["missingInputs"] == []
    assert payload["passedCheckCount"] == 1
    assert payload["blockedCheckCount"] == 0
    assert payload["checks"] == [
        {
            "id": "ready",
            "label": "全部输入就绪",
            "detail": "关系、权重、评分和异常校验均通过",
            "status": "pass",
            "owner": "evaluation_owner",
            "action": "none",
        }
    ]
    report_hash = payload["reportHash"]
    assert report_hash.startswith("sha256:")
    assert len(report_hash) == len("sha256:") + 64


def test_score_blocker_includes_source_and_calculation_checks_without_writing(
    client: TestClient,
) -> None:
    run_path = "/api/v1/evaluations/runs/eval-2026-068"
    baseline_run = client.get(run_path).json()
    baseline_objects = client.get("/api/v1/evaluations/objects").json()

    response = client.get(f"{run_path}/preflight")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "blocked"
    assert payload["evaluationObjectId"] == "evaluation-ct5"
    assert payload["blockers"] == [
        "团队互评汇总缺少 6 名学生记录",
        "团队协作缺少有效得分率",
    ]
    assert payload["missingInputs"] == [
        {
            "id": "input-teamwork",
            "label": "团队协作",
            "evidenceName": "团队互评汇总 v1.0",
        }
    ]
    assert payload["passedCheckCount"] == 1
    assert payload["blockedCheckCount"] == 2
    blocked_checks = {
        item["detail"]: item
        for item in payload["checks"]
        if item["status"] == "blocked"
    }
    assert blocked_checks["团队互评汇总缺少 6 名学生记录"][
        "owner"
    ] == "score_input"
    assert blocked_checks["团队互评汇总缺少 6 名学生记录"][
        "action"
    ] == "prepare_score_data"
    assert blocked_checks["团队协作缺少有效得分率"]["owner"] == (
        "score_input"
    )
    assert blocked_checks["团队协作缺少有效得分率"]["action"] == (
        "prepare_score_data"
    )
    assert client.get(run_path).json() == baseline_run
    assert client.get("/api/v1/evaluations/objects").json() == baseline_objects


def test_relation_blocker_uses_graph_ownership_without_parsing_copy(
    client: TestClient,
) -> None:
    response = client.get(
        "/api/v1/evaluations/runs/eval-2026-070/preflight"
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "blocked"
    assert payload["missingInputs"] == []
    assert payload["blockedCheckCount"] == 1
    relation = next(item for item in payload["checks"] if item["id"] == "relations")
    assert relation == {
        "id": "relations",
        "label": "正式关系不完整",
        "detail": "评分项尚未关联正式能力节点",
        "status": "blocked",
        "owner": "ability_graph",
        "action": "repair_graph_relation",
    }


def test_non_presented_run_is_preflighted_by_exact_run_id(
    client: TestClient,
) -> None:
    response = client.get(
        "/api/v1/evaluations/runs/eval-2026-072/preflight"
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["runId"] == "eval-2026-072"
    assert payload["evaluationObjectId"] == "evaluation-ct6"
    assert payload["status"] == "ready"
    assert payload["inputSnapshotHash"] == "sha256:13a7…90de"


@mark.parametrize(
    ("encoded_run_id", "decoded_run_id"),
    [
        ("eval-unknown", "eval-unknown"),
        ("%20eval-2026-071%20", " eval-2026-071 "),
        ("Eval-2026-071", "Eval-2026-071"),
    ],
)
def test_preflight_uses_case_sensitive_opaque_ids(
    client: TestClient,
    encoded_run_id: str,
    decoded_run_id: str,
) -> None:
    response = client.get(
        f"/api/v1/evaluations/runs/{encoded_run_id}/preflight"
    )

    assert response.status_code == 404
    assert response.json() == {
        "detail": {
            "code": "evaluation_run_not_found",
            "message": "未找到指定评价运行",
            "runId": decoded_run_id,
        }
    }


def test_preflight_rejects_a_blank_run_id(client: TestClient) -> None:
    response = client.get(
        "/api/v1/evaluations/runs/%20%20/preflight"
    )

    assert response.status_code == 422


def test_weight_calculation_blocker_is_promoted_to_a_structured_check() -> None:
    source = next(
        snapshot
        for snapshot in load_pilot_evaluation_seed().runs
        if snapshot.run.run_id == "eval-2026-071"
    )
    inputs = (
        replace(source.run.inputs[0], weight=Decimal("0.5")),
        replace(source.run.inputs[1], weight=Decimal("0.3")),
    )
    run = replace(source.run, run_id="eval-weight-blocked", inputs=inputs)
    snapshot = EvaluationRunSnapshot(
        run=run,
        calculation=calculate_attainment(run),
    )

    report = build_evaluation_preflight_report(snapshot)

    assert report.status == "blocked"
    weight_check = next(
        check
        for check in report.checks
        if check.check_id == "calculation:weight-total"
    )
    assert weight_check.status == "blocked"
    assert weight_check.owner == "evaluation_policy"
    assert weight_check.action == "review_evaluation_policy"
    assert report.blocked_check_count == 1
