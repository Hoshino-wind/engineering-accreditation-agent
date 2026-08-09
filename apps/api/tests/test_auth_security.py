"""安全基线测试（第 1 步）：
- 公开注册默认关闭；
- 开放注册时角色强制为最小权限（teacher），请求体 role 字段被忽略；
- X-Major-Id 归属校验：未持有该专业时返回 403；
- 非开发环境禁止使用默认 JWT 密钥。
"""
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app


@pytest.fixture(autouse=True)
def _isolate_json_data(monkeypatch, tmp_path) -> None:
    """把 JSON 落盘目录指向临时目录，避免测试污染 apps/api/data/。"""
    import app.core.json_persistence as jp

    monkeypatch.setattr(jp, "_DATA_DIR", Path(tmp_path))
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _register(client: TestClient, **overrides) -> object:
    payload = {
        "username": "teacher1",
        "password": "Passw0rd!",
        "display_name": "测试教师",
        **overrides,
    }
    return client.post("/api/v1/auth/register", json=payload)


def test_public_registration_closed_by_default() -> None:
    with TestClient(create_app()) as client:
        response = _register(client)
    assert response.status_code == 403
    assert "公开注册已关闭" in response.json()["detail"]


def test_public_registration_open_creates_minimal_privilege_user(
    monkeypatch,
) -> None:
    monkeypatch.setenv("EA_ALLOW_PUBLIC_REGISTRATION", "true")
    with TestClient(create_app()) as client:
        # 即使请求体伪造 role=admin，也必须被忽略
        response = _register(client, role="admin")
        assert response.status_code == 200, response.text
        token = response.json()["access_token"]
        me = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert me.status_code == 200
    assert me.json()["role"] == "teacher"
    assert me.json()["username"] == "teacher1"


def test_major_ownership_enforced() -> None:
    with TestClient(create_app()) as client:
        login = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        assert login.status_code == 200, login.text
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 当前用户持有的专业（seed major-eie）→ 允许
        ok = client.get(
            "/api/v1/resources",
            headers={**headers, "X-Major-Id": "major-eie"},
        )
        # 未持有的专业 / 猜测 ID → 403
        bad = client.get(
            "/api/v1/resources",
            headers={**headers, "X-Major-Id": "major-hacked"},
        )
    assert ok.status_code == 200
    assert bad.status_code == 403
    assert "无权访问" in bad.json()["detail"]


def test_unauthenticated_request_with_major_header_rejected() -> None:
    with TestClient(create_app()) as client:
        response = client.get(
            "/api/v1/resources", headers={"X-Major-Id": "major-eie"}
        )
    assert response.status_code in (401, 403)


def test_jwt_secret_required_outside_development() -> None:
    from pydantic import ValidationError

    from app.core.config import Settings

    with pytest.raises(ValidationError) as exc_info:
        Settings(environment="production")
    assert "EA_JWT_SECRET" in str(exc_info.value)


def test_jwt_secret_explicit_value_accepted_outside_development() -> None:
    from app.core.config import Settings

    settings = Settings(
        environment="production",
        jwt_secret="a-strong-production-secret-value",
    )
    assert settings.jwt_secret.get_secret_value() == "a-strong-production-secret-value"
