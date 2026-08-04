import base64
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import create_app


def _register_headers(client: TestClient) -> dict[str, str]:
    suffix = uuid4().hex[:8]
    response = client.post(
        "/api/v1/auth/register",
        json={
            "username": f"material-flow-{suffix}",
            "password": "123456",
            "display_name": "Flow Test Teacher",
            "role": "teacher",
        },
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_uploaded_material_parse_review_projects_to_graph_with_trace() -> None:
    with TestClient(create_app()) as client:
        headers = _register_headers(client)
        catalog = client.get("/api/v1/academic/catalog", headers=headers).json()
        course_name = catalog["courses"][0]["name"]

        content = (
            f"课程名称：{course_name}\n"
            "实验一：GPIO 与定时器综合实验\n"
            "实验任务：使用 STM32 开发板完成 LED 控制、按键中断和串口调试。\n"
            "支撑毕业要求指标点：C-05-01。\n"
        )
        upload = client.post(
            "/api/v1/materials/upload",
            headers=headers,
            json={
                "fileName": "embedded-flow-test.txt",
                "category": "课程大纲",
                "contentBase64": base64.b64encode(content.encode("utf-8")).decode("ascii"),
                "contentType": "text/plain",
                "course": course_name,
            },
        )
        assert upload.status_code == 200

        material_id = upload.json()["id"]
        versions_before_parse = client.get(
            f"/api/v1/materials/{material_id}/versions",
            headers=headers,
        )
        assert versions_before_parse.status_code == 200
        assert versions_before_parse.json()[0]["versionNo"] == 1

        ocr_status = client.get("/api/v1/materials/ocr/status", headers=headers)
        assert ocr_status.status_code == 200
        assert ocr_status.json()["engine"] == "tesseract"

        parsed = client.post(f"/api/v1/materials/{material_id}/parse", headers=headers)
        assert parsed.status_code == 200
        parsed_body = parsed.json()
        assert parsed_body["candidatesCreated"] >= 1
        assert parsed_body["parseArtifacts"]["parser"]["strategy"] in {
            "rules+catalog",
            "rules+catalog+llm",
        }
        assert parsed_body["parseArtifacts"]["candidateRelations"]
        versions_after_parse = client.get(
            f"/api/v1/materials/{material_id}/versions",
            headers=headers,
        )
        assert versions_after_parse.status_code == 200
        version = versions_after_parse.json()[0]
        assert version["parserVersion"] == parsed_body["material"]["parserVersion"]
        assert version["parseArtifacts"]["parser"]["strategy"] in {
            "rules+catalog",
            "rules+catalog+llm",
        }
        assert any("C-05-01" in item["targetNode"] for item in parsed_body["candidates"])

        candidate = next(
            item for item in parsed_body["candidates"] if "C-05-01" in item["targetNode"]
        )
        candidate_id = candidate["id"]
        review = client.post(
            f"/api/v1/recognition/candidates/{candidate_id}/review",
            headers=headers,
            json={
                "decision": "accept",
                "comment": "证据充分，可进入正式能力图谱。",
                "strength": "strong",
                "evidenceExcerpt": "教师确认：实验过程记录、调试截图和报告均可支撑 C-05-01。",
            },
        )
        assert review.status_code == 200
        reviewed = review.json()
        assert reviewed["reviewStatus"] == "accepted"
        assert reviewed["reviewedBy"] == "Flow Test Teacher"
        assert reviewed["reviewComment"] == "证据充分，可进入正式能力图谱。"
        assert reviewed["supportStrength"] == "strong"

        graph = client.get("/api/v1/graph", headers=headers)
        assert graph.status_code == 200
        projected_edges = [
            edge
            for edge in graph.json()["edges"]
            if edge.get("candidateId") == candidate_id
        ]
        assert projected_edges
        edge = projected_edges[0]
        assert edge["reviewStatus"] == "approved"
        assert edge["kind"] == "SUPPORTS"
        assert edge["reviewedBy"] == "Flow Test Teacher"
        assert edge["evidenceSummary"]
        assert "证据充分" in edge["aiReasoning"]

        refreshed_catalog = client.get("/api/v1/academic/catalog", headers=headers)
        assert refreshed_catalog.status_code == 200
        assert any(
            link["id"] == f"link-{candidate_id}"
            and link["targetIndicatorId"] == "C-05-01"
            and link["strength"] == "strong"
            and link["status"] == "approved"
            for link in refreshed_catalog.json()["supportLinks"]
        )
