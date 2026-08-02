from collections.abc import Iterator
from pathlib import Path

import pytest
from app.core.config import get_settings
from app.factory import create_app
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    monkeypatch.setenv("EA_LOCAL_DATA_DIR", str(tmp_path / "runtime"))
    monkeypatch.delenv("EA_DEEPSEEK_API_KEY", raising=False)
    monkeypatch.delenv("EA_DEEPSEEK_OCR_BASE_URL", raising=False)
    get_settings.cache_clear()
    with TestClient(create_app()) as test_client:
        yield test_client
    get_settings.cache_clear()


def upload_text(client: TestClient, content: bytes = "课程目标：掌握图算法。".encode()) -> str:
    response = client.post(
        "/api/v1/materials",
        data={"course": "数据结构", "resource_type": "课程大纲"},
        files={"file": ("syllabus.txt", content, "text/plain")},
    )
    assert response.status_code == 202
    return str(response.json()["id"])


def test_text_material_is_scanned_stored_and_parsed_locally(client: TestClient) -> None:
    material_id = upload_text(client)

    response = client.get(f"/api/v1/materials/{material_id}")
    payload = response.json()

    assert response.status_code == 200
    assert payload["status"] == "ready"
    assert payload["course"] == "数据结构"
    assert payload["hash"].startswith("SHA256 ")
    assert payload["version_id"] == f"material-version:{material_id}:v1"
    assert payload["source_coverage"] == 100
    assert payload["evidence_fragments"][0]["preview"] == "课程目标：掌握图算法。"
    assert [stage["status"] for stage in payload["processing_stages"]] == [
        "finish",
        "finish",
        "finish",
        "finish",
    ]
    listed = client.get("/api/v1/materials").json()
    assert listed["total"] == 1
    assert listed["items"][0]["id"] == material_id


def test_eicar_signature_is_quarantined_before_object_storage(client: TestClient) -> None:
    material_id = upload_text(
        client,
        (
            b"X5O!P%@AP[4\\PZX54(P^)7CC)7}$"
            b"EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
        ),
    )

    payload = client.get(f"/api/v1/materials/{material_id}").json()

    assert payload["status"] == "quarantined"
    assert "EICAR" in payload["failure_reason"]
    retry = client.post(f"/api/v1/materials/{material_id}/retry")
    assert retry.status_code == 409


def test_image_without_deepseek_ocr_endpoint_fails_with_retryable_reason(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/v1/materials",
        data={"course": "待分类", "resource_type": "学生报告"},
        files={
            "file": (
                "scan.png",
                b"\x89PNG\r\n\x1a\n" + b"prototype-image",
                "image/png",
            )
        },
    )
    material_id = response.json()["id"]

    payload = client.get(f"/api/v1/materials/{material_id}").json()

    assert payload["status"] == "failed"
    assert "EA_DEEPSEEK_OCR_BASE_URL" in payload["failure_reason"]
    retried = client.post(f"/api/v1/materials/{material_id}/retry")
    assert retried.status_code == 200
    assert retried.json()["status"] == "failed"


def test_file_header_mismatch_is_rejected_by_object_scan(client: TestClient) -> None:
    response = client.post(
        "/api/v1/materials",
        data={"course": "数据结构", "resource_type": "课程大纲"},
        files={"file": ("fake.pdf", b"not-a-pdf", "application/pdf")},
    )
    material_id = response.json()["id"]

    payload = client.get(f"/api/v1/materials/{material_id}").json()

    assert payload["status"] == "failed"
    assert payload["processing_stages"][0]["status"] == "error"
    assert "文件头" in payload["failure_reason"]
