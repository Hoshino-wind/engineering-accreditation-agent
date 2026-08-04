from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import create_app


def _login_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _register_headers(client: TestClient) -> dict[str, str]:
    suffix = uuid4().hex[:8]
    response = client.post(
        "/api/v1/auth/register",
        json={
            "username": f"academic-{suffix}",
            "password": "123456",
            "display_name": "Academic Test User",
            "role": "admin",
        },
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_academic_catalog_seeds_course_experiments_and_indicators() -> None:
    with TestClient(create_app()) as client:
        headers = _login_headers(client)
        response = client.get("/api/v1/academic/catalog", headers=headers)

    assert response.status_code == 200
    payload = response.json()

    assert payload["program"]["name"] == "电子信息工程（嵌入式）"
    assert any(course["name"] == "嵌入式系统原理" for course in payload["courses"])
    assert {indicator["code"] for indicator in payload["indicators"]} >= {
        "C-03-01",
        "C-05-01",
    }
    assert {experiment["title"] for experiment in payload["experiments"]} >= {
        "GPIO 与定时器综合实验",
        "传感器数据采集实验",
    }
    assert len(payload["rubricItems"]) >= 3
    assert any(
        link["sourceType"] == "experiment"
        and link["targetIndicatorId"] == "indicator-c-05-01"
        for link in payload["supportLinks"]
    )
    assert payload["sourceMaterials"][0]["fileName"] == "嵌入式系统原理课程大纲.txt"


def test_openapi_contains_academic_catalog_contract() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/api/openapi.json")

    assert response.status_code == 200
    assert "/api/v1/academic/catalog" in response.json()["paths"]


def test_academic_catalog_master_data_can_be_maintained() -> None:
    with TestClient(create_app()) as client:
        headers = _register_headers(client)
        catalog = client.get("/api/v1/academic/catalog", headers=headers).json()
        program_id = catalog["program"]["id"]

        program_response = client.patch(
            "/api/v1/academic/program",
            headers=headers,
            json={
                "code": "SE",
                "name": "软件工程",
                "discipline": "计算机类",
                "degree": "工学学士",
                "owner": "测试负责人",
                "evaluationCycle": "2026-2027",
                "status": "active",
            },
        )
        assert program_response.status_code == 200
        assert program_response.json()["name"] == "软件工程"

        course_response = client.post(
            "/api/v1/academic/courses",
            headers=headers,
            json={
                "programId": program_id,
                "code": "SE-101",
                "name": "软件工程导论",
                "category": "专业基础课",
                "term": "2026-2027-1",
                "creditHours": 32,
                "owner": "王老师",
                "status": "active",
            },
        )
        assert course_response.status_code == 201
        course = course_response.json()

        updated_course = client.patch(
            f"/api/v1/academic/courses/{course['id']}",
            headers=headers,
            json={
                "programId": program_id,
                "code": "SE-101",
                "name": "软件工程导论 A",
                "category": "专业基础课",
                "term": "2026-2027-1",
                "creditHours": 40,
                "owner": "王老师",
                "status": "active",
            },
        )
        assert updated_course.status_code == 200
        assert updated_course.json()["name"] == "软件工程导论 A"
        assert updated_course.json()["creditHours"] == 40

        requirement_response = client.post(
            "/api/v1/academic/graduation-requirements",
            headers=headers,
            json={
                "programId": program_id,
                "code": "GR-09",
                "title": "个人和团队",
                "description": "能够在多学科背景下承担个体、团队成员或负责人角色。",
            },
        )
        assert requirement_response.status_code == 201
        requirement = requirement_response.json()

        updated_requirement = client.patch(
            f"/api/v1/academic/graduation-requirements/{requirement['id']}",
            headers=headers,
            json={
                "programId": program_id,
                "code": "GR-09",
                "title": "个人与团队协作",
                "description": "能够在项目团队中完成分工协作和沟通。",
            },
        )
        assert updated_requirement.status_code == 200
        assert updated_requirement.json()["title"] == "个人与团队协作"

        indicator_response = client.post(
            "/api/v1/academic/indicators",
            headers=headers,
            json={
                "requirementId": requirement["id"],
                "code": "C-09-01",
                "title": "团队协作",
                "description": "能够完成团队分工、协作开发和阶段汇报。",
            },
        )
        assert indicator_response.status_code == 201
        indicator = indicator_response.json()

        updated_indicator = client.patch(
            f"/api/v1/academic/indicators/{indicator['id']}",
            headers=headers,
            json={
                "requirementId": requirement["id"],
                "code": "C-09-01",
                "title": "团队协作与沟通",
                "description": "能够完成团队分工、协作开发、阶段汇报和复盘。",
            },
        )
        assert updated_indicator.status_code == 200
        assert updated_indicator.json()["title"] == "团队协作与沟通"

        objective_response = client.post(
            "/api/v1/academic/objectives",
            headers=headers,
            json={
                "courseId": course["id"],
                "code": "CO-01",
                "title": "Course objective",
                "description": "Students can explain project requirements.",
            },
        )
        assert objective_response.status_code == 201
        objective = objective_response.json()
        updated_objective = client.patch(
            f"/api/v1/academic/objectives/{objective['id']}",
            headers=headers,
            json={
                "courseId": course["id"],
                "code": "CO-01",
                "title": "Course objective updated",
                "description": "Students can explain requirements and design.",
            },
        )
        assert updated_objective.status_code == 200
        assert updated_objective.json()["title"] == "Course objective updated"

        experiment_response = client.post(
            "/api/v1/academic/experiments",
            headers=headers,
            json={
                "courseId": course["id"],
                "code": "EXP-01",
                "title": "Project experiment",
                "description": "Build a runnable course project.",
                "environment": "Python / Git / pytest",
                "sourceMaterialId": None,
            },
        )
        assert experiment_response.status_code == 201
        experiment = experiment_response.json()
        updated_experiment = client.patch(
            f"/api/v1/academic/experiments/{experiment['id']}",
            headers=headers,
            json={
                "courseId": course["id"],
                "code": "EXP-01",
                "title": "Project experiment updated",
                "description": "Build a runnable and testable course project.",
                "environment": "Python / Git / pytest / CI",
                "sourceMaterialId": None,
            },
        )
        assert updated_experiment.status_code == 200
        assert updated_experiment.json()["title"] == "Project experiment updated"

        rubric_response = client.post(
            "/api/v1/academic/rubric-items",
            headers=headers,
            json={
                "courseId": course["id"],
                "experimentId": experiment["id"],
                "indicatorId": indicator["id"],
                "code": "RUB-01",
                "title": "Implementation and tests",
                "points": 40,
            },
        )
        assert rubric_response.status_code == 201
        rubric = rubric_response.json()
        updated_rubric = client.patch(
            f"/api/v1/academic/rubric-items/{rubric['id']}",
            headers=headers,
            json={
                "courseId": course["id"],
                "experimentId": experiment["id"],
                "indicatorId": indicator["id"],
                "code": "RUB-01",
                "title": "Implementation, tests and reflection",
                "points": 45,
            },
        )
        assert updated_rubric.status_code == 200
        assert updated_rubric.json()["points"] == 45

        refreshed = client.get("/api/v1/academic/catalog", headers=headers)

    assert refreshed.status_code == 200
    payload = refreshed.json()
    assert payload["program"]["name"] == "软件工程"
    assert any(course["name"] == "软件工程导论 A" for course in payload["courses"])
    assert any(
        requirement["title"] == "个人与团队协作"
        for requirement in payload["graduationRequirements"]
    )
    assert any(
        indicator["title"] == "团队协作与沟通"
        for indicator in payload["indicators"]
    )
    assert any(
        objective["title"] == "Course objective updated"
        for objective in payload["objectives"]
    )
    assert any(
        experiment["title"] == "Project experiment updated"
        for experiment in payload["experiments"]
    )
    assert any(
        item["title"] == "Implementation, tests and reflection"
        for item in payload["rubricItems"]
    )
