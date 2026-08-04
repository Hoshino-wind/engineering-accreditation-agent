import base64
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import create_app


def _register_headers(client: TestClient) -> dict[str, str]:
    suffix = uuid4().hex[:8]
    response = client.post(
        "/api/v1/auth/register",
        json={
            "username": f"diagnostics-{suffix}",
            "password": "123456",
            "display_name": "Diagnostics Teacher",
            "role": "teacher",
        },
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_graph_diagnostics_are_generated_and_decisions_are_persisted() -> None:
    with TestClient(create_app()) as client:
        headers = _register_headers(client)
        catalog = client.get("/api/v1/academic/catalog", headers=headers).json()
        course_name = catalog["courses"][0]["name"]

        content = (
            f"课程名称：{course_name}\n"
            "实验一：传感器数据采集实验\n"
            "实验任务：完成传感器数据读取、串口调试和工具链使用。\n"
            "支撑毕业要求指标点：C-05-01。\n"
        )
        upload = client.post(
            "/api/v1/materials/upload",
            headers=headers,
            json={
                "fileName": "diagnostics-flow.txt",
                "category": "课程大纲",
                "contentBase64": base64.b64encode(content.encode("utf-8")).decode("ascii"),
                "contentType": "text/plain",
                "course": course_name,
            },
        )
        assert upload.status_code == 200

        parsed = client.post(
            f"/api/v1/materials/{upload.json()['id']}/parse",
            headers=headers,
        )
        assert parsed.status_code == 200
        candidate = next(
            item for item in parsed.json()["candidates"] if "C-05-01" in item["targetNode"]
        )

        review = client.post(
            f"/api/v1/recognition/candidates/{candidate['id']}/review",
            headers=headers,
            json={
                "decision": "accept",
                "comment": "证据充分，进入正式图谱。",
                "strength": "strong",
                "evidenceExcerpt": "实验任务直接支撑 C-05-01。",
            },
        )
        assert review.status_code == 200

        report = client.get("/api/v1/diagnostics/graph", headers=headers)
        assert report.status_code == 200
        body = report.json()
        assert body["graphVersion"]
        assert body["diagnosticsMode"] in {"rules", "rules+llm"}
        assert isinstance(body["findings"], list)
        assert not any("C-05-01" in finding["targetNode"] for finding in body["findings"])

        finding = body["findings"][0]
        decision = client.post(
            f"/api/v1/diagnostics/findings/{finding['id']}/decision",
            headers=headers,
            json={"decision": "convert"},
        )
        assert decision.status_code == 200
        assert decision.json()["decisionStatus"] == "converted"

        refreshed = client.get("/api/v1/diagnostics/graph", headers=headers)
        assert refreshed.status_code == 200
        refreshed_finding = next(
            item for item in refreshed.json()["findings"] if item["id"] == finding["id"]
        )
        assert refreshed_finding["decisionStatus"] == "converted"
