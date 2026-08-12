"""结构化课程包导入。

采用新模板后教师填写的就是结构化数据，导入不需要 AI 抽取。
这组测试守住导入的两条纪律：不静默覆盖已有正式事实，重复导入是空操作。
"""

import copy
import json
from pathlib import Path
from typing import Any

import pytest
from app.core.config import get_settings
from app.factory import create_app
from app.modules.teaching_graph.contracts import ImportCoursePackageRequest
from app.modules.teaching_graph.domain import (
    CoursePackageReferenceError,
    build_course_package_objects,
    get_publish_blockers,
    merge_course_package,
)
from app.modules.teaching_graph.domain.graph import RELATION_ENDPOINT_PAIRS
from fastapi.testclient import TestClient
from pytest import MonkeyPatch

PACKAGE_PATH = (
    Path(__file__).resolve().parents[3]
    / "golden-sample"
    / "samples"
    / "sensor-lab-demo"
    / "course-package.json"
)
IMPORT_PATH = "/api/v1/teaching-graph/imports/course-package"
WORKSPACE_PATH = "/api/v1/teaching-graph/workspace"
SCHEMA_VERSION = "teaching-graph-schema@2"


def package_payload() -> dict[str, Any]:
    return json.loads(PACKAGE_PATH.read_text(encoding="utf-8"))


def expand(payload: dict[str, Any]):
    request = ImportCoursePackageRequest.model_validate(payload)
    return build_course_package_objects(request.to_domain())


def draft_state(nodes: list[dict], edges: list[dict]) -> dict[str, Any]:
    return {
        "schemaVersionId": SCHEMA_VERSION,
        "version": {"name": "v0.2", "baseVersion": "v0.1", "status": "draft"},
        "nodes": nodes,
        "edges": edges,
        "publishedSnapshots": [
            {
                "version": "v0.1",
                "nodes": [],
                "edges": [],
                "publishedAt": "2026-01-01T00:00:00Z",
                "schemaVersionId": SCHEMA_VERSION,
            }
        ],
        "downstreamReferences": [],
        "changeReviews": [],
        "impactDecisions": [],
    }


# --------------------------------------------------------------------------
# 展开
# --------------------------------------------------------------------------


def test_package_expands_to_the_full_publishable_ontology() -> None:
    nodes, edges = expand(package_payload())

    node_types = {item["type"] for item in nodes}
    relations = {item["relation"] for item in edges}

    assert node_types == {
        "course",
        "graduate-outcome",
        "ability",
        "performance-indicator",
        "course-outcome",
        "experiment",
        "assessment-task",
        "rubric-criterion",
    }
    # 发布门禁要求的四条对齐路径所需的关系都必须产出。
    assert {
        "refines",
        "expects",
        "defines",
        "supports",
        "belongs-to",
        "contributes-to",
        "cultivates",
        "contains-task",
        "contains-criterion",
        "assesses",
    } <= relations


def test_every_expanded_edge_uses_a_legal_endpoint_pair() -> None:
    nodes, edges = expand(package_payload())
    types = {item["id"]: item["type"] for item in nodes}

    for edge in edges:
        allowed = RELATION_ENDPOINT_PAIRS[edge["relation"]]
        pair = (types[edge["sourceId"]], types[edge["targetId"]])
        assert pair in allowed, f"{edge['relation']} 不允许 {pair[0]} → {pair[1]}"


def test_assesses_and_contributes_to_stay_independent() -> None:
    """ADR-001 第 5.1 节：评价效度与聚合路径是两条独立关系。"""
    nodes, edges = expand(package_payload())
    types = {item["id"]: item["type"] for item in nodes}

    assessed = {
        item["sourceId"] for item in edges if item["relation"] == "assesses"
    }
    aggregated = {
        item["sourceId"]
        for item in edges
        if item["relation"] == "contributes-to"
        and types[item["sourceId"]] == "rubric-criterion"
    }

    assert assessed == aggregated
    # assesses 指向能力，contributes-to 指向课程目标，端点类型不同。
    for edge in edges:
        if edge["relation"] == "assesses":
            assert types[edge["targetId"]] == "ability"


def test_expansion_is_deterministic() -> None:
    first_nodes, first_edges = expand(package_payload())
    second_nodes, second_edges = expand(package_payload())

    assert first_nodes == second_nodes
    assert first_edges == second_edges


def test_criteria_carry_no_weight() -> None:
    """权重属于 M6 策略版本，绝不能出现在图谱对象里。"""
    nodes, edges = expand(package_payload())

    assert "weight" not in json.dumps(nodes + edges)


def test_broken_reference_is_rejected_before_expansion() -> None:
    payload = package_payload()
    payload["criteria"][0]["courseOutcomeCode"] = "CO-NOT-EXIST"

    with pytest.raises(CoursePackageReferenceError) as error:
        expand(payload)

    assert any("不存在的课程目标" in item for item in error.value.problems)


# --------------------------------------------------------------------------
# 合并纪律
# --------------------------------------------------------------------------


def test_reimporting_identical_content_is_a_no_op() -> None:
    nodes, edges = expand(package_payload())
    state = draft_state(nodes, edges)

    merge = merge_course_package(state, *expand(package_payload()))

    assert merge.conflicts == ()
    assert merge.added_node_ids == ()
    assert merge.added_edge_ids == ()
    assert len(merge.unchanged_node_ids) == len(nodes)
    assert len(merge.nodes) == len(nodes)


def test_changed_content_conflicts_instead_of_overwriting() -> None:
    """已存在对象内容变化必须走图谱修订，导入不得静默改写正式事实。"""
    nodes, edges = expand(package_payload())
    state = draft_state(nodes, edges)
    changed = package_payload()
    changed["courseOutcomes"][0]["name"] = "改了名字的课程目标"

    merge = merge_course_package(state, *expand(changed))

    assert merge.conflicts
    assert any(item.entity_kind == "node" for item in merge.conflicts)
    # 冲突时不产出任何写入结果。
    assert merge.nodes == []
    assert merge.added_node_ids == ()


def test_import_into_empty_draft_adds_everything() -> None:
    nodes, edges = expand(package_payload())

    merge = merge_course_package(draft_state([], []), nodes, edges)

    assert merge.conflicts == ()
    assert len(merge.added_node_ids) == len(nodes)
    assert len(merge.added_edge_ids) == len(edges)


# --------------------------------------------------------------------------
# 发布门禁的当前行为
# --------------------------------------------------------------------------


def test_imported_package_satisfies_schema_and_alignment_except_review() -> None:
    """导入产物本身结构合法；剩余阻断都是人工审核门槛，不是导入缺陷。"""
    nodes, edges = expand(package_payload())

    blockers = get_publish_blockers(draft_state(nodes, edges))

    assert all("审核" in item or "归集路径" in item for item in blockers), blockers
    assert not any("Schema 未通过" in item for item in blockers)


def test_publish_gate_currently_rejects_criteria_split_across_outcomes() -> None:
    """记录 M2 发布门禁的一条现存约束，而不是绕过它。

    当前 `_alignment_flags` 要求：一个实验支撑某课程目标时，该实验考核任务下
    **所有**评价了目标能力的评分项都必须归集到同一课程目标。

    因此"一份实验报告的不同评分项分别度量不同课程目标"这一常见结构会被拒绝。
    本测试固定该行为，待业务决定是否放宽后再更新。
    """
    payload = package_payload()
    nodes, edges = expand(payload)
    cross_mapped = [
        item for item in get_publish_blockers(draft_state(nodes, edges))
        if "归集路径" in item
    ]

    assert cross_mapped, "跨课程目标归集当前应被门禁拒绝"

    # 把每个实验的评分项收敛到单一课程目标后，该阻断消失。
    task_to_experiment = {
        item["code"]: item["experimentCode"] for item in payload["assessmentTasks"]
    }
    single = copy.deepcopy(payload)
    mapping = {"EXP-01": "CO-1", "EXP-02": "CO-2", "EXP-03": "CO-3"}
    for criterion in single["criteria"]:
        criterion["courseOutcomeCode"] = mapping[task_to_experiment[criterion["taskCode"]]]
    for experiment in single["experiments"]:
        experiment["courseOutcomeCodes"] = [mapping[experiment["code"]]]

    single_nodes, single_edges = expand(single)
    remaining = [
        item
        for item in get_publish_blockers(draft_state(single_nodes, single_edges))
        if "归集路径" in item
    ]

    assert remaining == []


# --------------------------------------------------------------------------
# HTTP 契约
# --------------------------------------------------------------------------


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: MonkeyPatch):
    monkeypatch.setenv("EA_LOCAL_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("EA_ENVIRONMENT", "test")
    get_settings.cache_clear()
    with TestClient(create_app()) as test_client:
        yield test_client
    get_settings.cache_clear()


def initialize_workspace(client: TestClient) -> int:
    response = client.put(
        WORKSPACE_PATH,
        json={"expectedRevision": 0, "state": draft_state([], [])},
    )
    assert response.status_code == 200, response.text
    return int(response.json()["revision"])


def test_import_requires_an_initialized_workspace(client: TestClient) -> None:
    """导入不创建正式基线：没有基线的草稿永远无法发布。"""
    response = client.post(IMPORT_PATH, json=package_payload())

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "graph_workspace_not_initialized"


def test_import_merges_the_package_into_the_draft(client: TestClient) -> None:
    revision = initialize_workspace(client)
    payload = {**package_payload(), "expectedRevision": revision}

    response = client.post(IMPORT_PATH, json=payload)

    assert response.status_code == 200, response.text
    state = response.json()["state"]
    expected_nodes, expected_edges = expand(package_payload())
    assert len(state["nodes"]) == len(expected_nodes)
    assert len(state["edges"]) == len(expected_edges)


def test_second_identical_import_changes_nothing(client: TestClient) -> None:
    revision = initialize_workspace(client)
    first = client.post(IMPORT_PATH, json={**package_payload(), "expectedRevision": revision})
    assert first.status_code == 200
    first_state = first.json()["state"]

    second = client.post(
        IMPORT_PATH,
        json={**package_payload(), "expectedRevision": int(first.json()["revision"])},
    )

    assert second.status_code == 200
    assert second.json()["state"]["nodes"] == first_state["nodes"]
    assert second.json()["state"]["edges"] == first_state["edges"]


def test_conflicting_reimport_is_rejected(client: TestClient) -> None:
    revision = initialize_workspace(client)
    first = client.post(IMPORT_PATH, json={**package_payload(), "expectedRevision": revision})
    assert first.status_code == 200

    changed = package_payload()
    changed["courseOutcomes"][0]["name"] = "改了名字的课程目标"
    changed["expectedRevision"] = int(first.json()["revision"])

    response = client.post(IMPORT_PATH, json=changed)

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "course_package_conflict"
    assert response.json()["detail"]["conflicts"]


def test_stale_revision_is_rejected(client: TestClient) -> None:
    initialize_workspace(client)

    response = client.post(IMPORT_PATH, json={**package_payload(), "expectedRevision": 99})

    assert response.status_code == 409


def test_import_endpoint_is_exposed_in_the_openapi_contract(client: TestClient) -> None:
    schema = client.app.openapi()

    assert IMPORT_PATH in schema["paths"]
    request_schema = schema["components"]["schemas"]["ImportCoursePackageRequest"]
    assert request_schema["additionalProperties"] is False
    # 评分项契约不含权重字段：权重属于 M6 策略。
    criterion_schema = schema["components"]["schemas"]["PackageCriterionContract"]
    assert "weight" not in criterion_schema["properties"]
