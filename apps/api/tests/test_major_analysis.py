"""学院级分析与资源建议测试（第 5 步补缺）。"""
from __future__ import annotations

import asyncio
from pathlib import Path

import pytest
from app.core.config import get_settings
from app.main import create_app
from app.modules.majors.application.analysis import GetMajorAnalysis
from fastapi.testclient import TestClient


class _FakeResources:
    def __init__(self, items):
        self._items = items

    async def list_all(self):
        return self._items


class _FakeMajors:
    def __init__(self, majors):
        self._majors = majors

    async def get_by_id(self, major_id):
        return self._majors.get(major_id)

    async def list_all(self):
        return list(self._majors.values())


class _FakeCoverage:
    def __init__(self, rate, gaps):
        self._rate = rate
        self._gaps = gaps

    async def __call__(self, *args, **kwargs):
        return {"coverageRate": self._rate, "gaps": self._gaps}


def test_analysis_suggests_material_improvement_and_gap_resources() -> None:
    from app.modules.majors.domain.major import Major
    from app.modules.resources.domain.resource import (
        TeachingResource,
        TeachingResourceSensitivity,
        TeachingResourceStatus,
        TeachingResourceType,
    )

    major = Major(
        id="major-eie", code="080701", name="电子信息工程（嵌入式）",
        school_name="示例大学", standard_version="2024",
    )
    resource = TeachingResource(
        id="res-1", name="实验指导书", file_name="lab.pdf", course="单片机基础",
        resource_type=TeachingResourceType.LAB_GUIDE, version="v1", format="PDF",
        status=TeachingResourceStatus.READY, size="1MB",
        sensitivity=TeachingResourceSensitivity.INTERNAL,
        updated_at="2026-01-01", owner="user-1", hash="h", next_action="",
        source_coverage=50, major_id="major-eie",
    )
    use_case = GetMajorAnalysis(
        majors=_FakeMajors({"major-eie": major}),
        resources=_FakeResources([resource]),
        coverage_provider=_FakeCoverage(0.4, [{"code": "C-01-01"}]),
    )

    result = asyncio.run(use_case.execute("major-eie"))

    assert result.major_name == "电子信息工程（嵌入式）"
    assert result.coverage_rate == 0.4
    assert "C-01-01" in result.gap_competencies
    kinds = {s.kind for s in result.suggestions}
    assert "add-material" in kinds
    assert all(s.priority in ("high", "medium", "low") for s in result.suggestions)


def test_analysis_handles_unknown_major() -> None:
    use_case = GetMajorAnalysis(
        majors=_FakeMajors({}),
        resources=_FakeResources([]),
        coverage_provider=_FakeCoverage(None, []),
    )
    result = asyncio.run(use_case.execute("major-missing"))
    assert result.major_name == "Unregistered major"
    assert result.resource_count == 0


@pytest.fixture(autouse=True)
def _isolate_json_data(monkeypatch, tmp_path) -> None:
    import app.core.json_persistence as jp

    monkeypatch.setattr(jp, "_DATA_DIR", Path(tmp_path))
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_major_analysis_and_summary_api() -> None:
    with TestClient(create_app()) as client:
        login = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        analysis = client.get(
            "/api/v1/majors/analysis", headers=headers, params={"major_id": "major-eie"}
        )
        assert analysis.status_code == 200, analysis.text
        payload = analysis.json()
        assert payload["majorId"] == "major-eie"
        assert isinstance(payload["suggestions"], list)

        summary = client.get("/api/v1/majors/summary", headers=headers)
        assert summary.status_code == 200, summary.text
        assert summary.json()["majorCount"] >= 1
