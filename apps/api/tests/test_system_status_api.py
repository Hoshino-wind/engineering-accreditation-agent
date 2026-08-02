from app.core.config import get_settings
from app.factory import create_app
from fastapi.testclient import TestClient


def test_system_status_is_exposed_through_public_api() -> None:
    get_settings.cache_clear()
    with TestClient(create_app()) as client:
        response = client.get("/api/v1/system/status")

    assert response.status_code == 200
    payload = response.json()
    assert payload["service"] == "engineering-accreditation-api"
    assert payload["version"] == "0.1.0"
    assert payload["status"] == "operational"
    assert [item["key"] for item in payload["components"]] == [
        "api",
        "database",
        "task_queue",
        "object_storage",
    ]
    assert payload["components"][0]["status"] == "operational"
    assert all(
        item["status"] in {"operational", "configured"}
        for item in payload["components"]
    )
    assert payload["components"][1]["detail"] == "local 运行适配器已启用"


def test_openapi_contains_versioned_system_status_contract() -> None:
    get_settings.cache_clear()
    with TestClient(create_app()) as client:
        response = client.get("/api/openapi.json")

    assert response.status_code == 200
    assert "/api/v1/system/status" in response.json()["paths"]
