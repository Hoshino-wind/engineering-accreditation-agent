from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import create_app


def _register_headers(client: TestClient) -> dict[str, str]:
    suffix = uuid4().hex[:8]
    response = client.post(
        "/api/v1/auth/register",
        json={
            "username": f"improvements-{suffix}",
            "password": "123456",
            "display_name": "Improvement Teacher",
            "role": "teacher",
        },
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_converted_diagnostic_finding_creates_editable_improvement_task() -> None:
    with TestClient(create_app()) as client:
        headers = _register_headers(client)

        report = client.get("/api/v1/diagnostics/graph", headers=headers)
        assert report.status_code == 200
        finding = report.json()["findings"][0]

        decision = client.post(
            f"/api/v1/diagnostics/findings/{finding['id']}/decision",
            headers=headers,
            json={"decision": "convert"},
        )
        assert decision.status_code == 200
        assert decision.json()["decisionStatus"] == "converted"

        tasks = client.get("/api/v1/improvements/tasks", headers=headers)
        assert tasks.status_code == 200
        body = tasks.json()
        assert len(body) == 1
        task = body[0]
        assert task["sourceModule"] == "M5"
        assert task["sourceFindingId"] == finding["id"]
        assert task["status"] == "planned"
        assert task["owner"] == "待分配"

        updated = client.patch(
            f"/api/v1/improvements/tasks/{task['id']}",
            headers=headers,
            json={
                "owner": "张老师",
                "status": "in-progress",
                "dueAt": "2026-08-20",
                "completionSummary": "已安排补充实验指导书和评分项。",
            },
        )
        assert updated.status_code == 200
        updated_body = updated.json()
        assert updated_body["owner"] == "张老师"
        assert updated_body["status"] == "in-progress"
        assert updated_body["completionSummary"] == "已安排补充实验指导书和评分项。"

        refreshed = client.get("/api/v1/improvements/tasks", headers=headers)
        assert refreshed.status_code == 200
        assert refreshed.json()[0]["owner"] == "张老师"
