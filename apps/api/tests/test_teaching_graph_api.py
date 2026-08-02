import json
import sqlite3
from collections.abc import Iterator
from copy import deepcopy
from pathlib import Path
from typing import Any

import pytest
from app.core.config import get_settings
from app.factory import create_app
from fastapi.testclient import TestClient

SCHEMA_VERSION_ID = "teaching-graph-schema@2"


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    monkeypatch.setenv("EA_LOCAL_DATA_DIR", str(tmp_path / "runtime"))
    get_settings.cache_clear()
    with TestClient(create_app()) as test_client:
        yield test_client
    get_settings.cache_clear()


def source(coordinate: str, *, version: str = "v1") -> dict[str, str]:
    reference_key = coordinate.replace(" ", "-")
    return {
        "sourceRefId": f"source-ref:{reference_key}:{version}",
        "materialId": "material:course-syllabus",
        "materialVersionId": f"material-version:course-syllabus:{version}",
        "evidenceFragmentId": f"fragment:{reference_key}:{version}",
        "material": "测试课程大纲",
        "version": version,
        "coordinate": coordinate,
    }


def legacy_source(coordinate: str) -> dict[str, str]:
    return {
        "material": "旧版数据结构课程大纲",
        "version": "v1",
        "coordinate": coordinate,
    }


def legacy_node(
    identifier: str,
    code: str,
    node_type: str,
    *,
    name: str,
    course: str | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "id": identifier,
        "code": code,
        "name": name,
        "definition": f"{name}的旧版定义",
        "type": node_type,
        "status": "effective",
        "owner": "旧版课程负责人",
        "version": "v1.0",
        "course": course,
        "source": legacy_source(f"节点-{code}"),
    }
    if node_type == "performance-indicator":
        payload["capability"] = {
            "domain": "算法分析",
            "cognitiveLevel": "analyze",
            "observableBehaviors": ["分析算法并形成可验证结论"],
        }
    return payload


def legacy_edge(
    identifier: str,
    relation: str,
    source_id: str,
    target_id: str,
    *,
    capability_mapping: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "id": identifier,
        "relation": relation,
        "sourceId": source_id,
        "targetId": target_id,
        "status": "effective",
        "reviewStatus": "approved",
        "effectiveCycle": "2024—2025 学年",
        "source": legacy_source(f"关系-{identifier}"),
    }
    if capability_mapping is not None:
        payload["capabilityMapping"] = capability_mapping
    return payload


def legacy_graph_state() -> dict[str, Any]:
    nodes = [
        legacy_node("legacy-go", "GR-1", "graduate-outcome", name="工程知识"),
        legacy_node(
            "legacy-pi",
            "PI-1.1",
            "performance-indicator",
            name="分析复杂工程问题",
        ),
        legacy_node(
            "legacy-co",
            "CO-1",
            "course-outcome",
            name="分析算法复杂度",
            course="数据结构",
        ),
        legacy_node(
            "legacy-exp",
            "EXP-1",
            "experiment",
            name="排序算法综合实验",
            course="数据结构",
        ),
        legacy_node(
            "legacy-task",
            "TASK-1",
            "assessment-task",
            name="实验报告",
            course="数据结构",
        ),
        legacy_node(
            "legacy-criterion",
            "RC-1",
            "rubric-criterion",
            name="复杂度论证",
            course="数据结构",
        ),
    ]
    edges = [
        legacy_edge("legacy-refines", "refines", "legacy-go", "legacy-pi"),
        legacy_edge(
            "legacy-supports",
            "supports",
            "legacy-co",
            "legacy-pi",
            capability_mapping={
                "rationale": "课程目标支撑指标点中的算法分析行为",
                "targetBehaviors": ["分析算法并形成可验证结论"],
            },
        ),
        legacy_edge(
            "legacy-shortcut",
            "supports",
            "legacy-co",
            "legacy-go",
        ),
        legacy_edge(
            "legacy-teaching",
            "contributes-to",
            "legacy-exp",
            "legacy-co",
        ),
        legacy_edge(
            "legacy-task-link",
            "contains-task",
            "legacy-exp",
            "legacy-task",
        ),
        legacy_edge(
            "legacy-criterion-link",
            "contains-criterion",
            "legacy-task",
            "legacy-criterion",
        ),
        legacy_edge(
            "legacy-assessment",
            "assesses",
            "legacy-criterion",
            "legacy-co",
        ),
    ]
    return {
        "version": {
            "name": "v0.2",
            "baseVersion": "v0.1",
            "status": "draft",
        },
        "nodes": deepcopy(nodes),
        "edges": deepcopy(edges),
        "evidenceSnapshots": [
            {
                "id": "legacy-evaluation-input",
                "courseOffering": "2024 秋季 · 数据结构 01 班",
                "courseOutcomeId": "legacy-co",
                "sampleSize": 42,
                "snapshotHash": "sha256:legacy",
                "status": "ready",
                "inputs": [
                    {
                        "criterionId": "legacy-criterion",
                        "scoreRate": 0.82,
                        "weight": 1,
                    }
                ],
            }
        ],
        "publishedSnapshots": [
            {
                "version": "v0.1",
                "publishedAt": "2025-06-30T09:00:00+08:00",
                "nodes": nodes,
                "edges": edges,
            }
        ],
        "downstreamReferences": [
            {
                "id": "legacy-evaluation",
                "module": "M6",
                "objectCode": "EVAL-LEGACY",
                "label": "旧版课程目标评价",
                "graphVersion": "v0.1",
                "nodeIds": ["legacy-co"],
                "edgeIds": ["legacy-assessment"],
                "suggestedAction": "recalculate",
            }
        ],
        "changeReviews": [],
        "impactDecisions": [],
    }


def insert_legacy_workspace(
    database_path: Path,
    state: dict[str, Any],
) -> None:
    with sqlite3.connect(database_path) as connection:
        connection.execute(
            """
            INSERT INTO graph_workspaces(id, revision, updated_at, updated_by, state)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                "default",
                1,
                "2026-07-29T04:39:05+00:00",
                "旧版用户",
                json.dumps(state, ensure_ascii=False),
            ),
        )


def read_persisted_workspace_state(database_path: Path) -> dict[str, Any]:
    with sqlite3.connect(database_path) as connection:
        row = connection.execute(
            "SELECT state FROM graph_workspaces WHERE id = ?",
            ("default",),
        ).fetchone()
    assert row is not None
    return json.loads(str(row[0]))


def node(
    identifier: str,
    code: str,
    node_type: str,
    *,
    name: str,
    status: str = "effective",
    version: str = "v1.0",
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "id": identifier,
        "nodeVersionId": f"{identifier}@{version}",
        "code": code,
        "name": name,
        "definition": f"{name}的正式定义",
        "type": node_type,
        "status": status,
        "owner": "课程负责人",
        "version": version,
        "source": source(f"节点-{code}", version=version),
    }
    if node_type == "ability":
        payload["capability"] = {
            "domain": "算法分析",
            "cognitiveLevel": "analyze",
            "observableBehaviors": ["分析算法并形成可验证结论"],
        }
    if node_type == "skill":
        payload["capability"] = {
            "domain": "实验验证",
            "cognitiveLevel": "apply",
            "observableBehaviors": ["使用测试数据比较算法性能"],
        }
    return payload


def edge(
    identifier: str,
    relation: str,
    source_id: str,
    target_id: str,
    *,
    source_node_version: str = "v1.0",
    target_node_version: str = "v1.0",
    capability_mapping: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "id": identifier,
        "edgeVersionId": f"{identifier}@v1.0",
        "relation": relation,
        "sourceId": source_id,
        "sourceNodeVersionId": f"{source_id}@{source_node_version}",
        "targetId": target_id,
        "targetNodeVersionId": f"{target_id}@{target_node_version}",
        "status": "effective",
        "reviewStatus": "approved",
        "effectiveCycle": "2025—2026 学年",
        "source": source(f"关系-{identifier}"),
    }
    if capability_mapping is not None:
        payload["capabilityMapping"] = capability_mapping
    return payload


def baseline_graph() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    nodes = [
        node("gr1", "GR-1", "graduate-outcome", name="工程知识"),
        node("pi1", "PI-1.1", "performance-indicator", name="分析复杂工程问题"),
        node("course1", "COURSE-1", "course", name="数据结构"),
        node("co1", "CO-1", "course-outcome", name="分析算法复杂度"),
        node("ability1", "BA-1", "ability", name="算法分析能力"),
        node("skill1", "SK-1", "skill", name="实验数据分析技能"),
        node("knowledge1", "KP-1", "knowledge", name="时间复杂度"),
        node("exp1", "EXP-1", "experiment", name="排序算法综合实验"),
        node(
            "resource1",
            "TR-1",
            "teaching-resource",
            name="性能测试数据集",
        ),
        node(
            "resource2",
            "TR-2",
            "teaching-resource",
            name="算法可视化工具",
        ),
        node("task1", "TASK-1", "assessment-task", name="实验报告"),
        node("criterion1", "RC-1", "rubric-criterion", name="复杂度论证"),
    ]
    edges = [
        edge("edge-refines", "refines", "gr1", "pi1"),
        edge("edge-expects", "expects", "pi1", "ability1"),
        edge("edge-defines", "defines", "course1", "co1"),
        edge(
            "edge-belongs-to",
            "belongs-to",
            "exp1",
            "course1",
        ),
        edge(
            "edge-supports",
            "supports",
            "co1",
            "pi1",
            capability_mapping={
                "rationale": "课程目标通过算法分析行为支撑指标点",
                "targetBehaviors": ["分析算法并形成可验证结论"],
            },
        ),
        edge("edge-teaching", "contributes-to", "exp1", "co1"),
        edge("edge-cultivates", "cultivates", "exp1", "ability1"),
        edge("edge-trains", "trains", "exp1", "skill1"),
        edge("edge-covers", "covers", "exp1", "knowledge1"),
        edge("edge-ability-skill", "composed-of", "ability1", "skill1"),
        edge("edge-skill-knowledge", "requires", "skill1", "knowledge1"),
        edge("edge-uses", "uses", "exp1", "resource1"),
        edge(
            "edge-resource-support",
            "enables",
            "resource1",
            "skill1",
        ),
        edge("edge-task", "contains-task", "exp1", "task1"),
        edge(
            "edge-criterion",
            "contains-criterion",
            "task1",
            "criterion1",
        ),
        edge("edge-assessment", "assesses", "criterion1", "skill1"),
        edge(
            "edge-aggregation",
            "contributes-to",
            "criterion1",
            "co1",
        ),
    ]
    return nodes, edges


def graph_state() -> dict[str, Any]:
    baseline_nodes, baseline_edges = baseline_graph()
    draft_nodes = deepcopy(baseline_nodes)
    resource_index = next(
        index
        for index, item in enumerate(draft_nodes)
        if item["id"] == "resource2"
    )
    draft_nodes[resource_index] = node(
        "resource2",
        "TR-2",
        "teaching-resource",
        name="算法过程可视化与对比工具",
        status="draft",
        version="v2.0",
    )
    return {
        "schemaVersionId": SCHEMA_VERSION_ID,
        "version": {
            "name": "v0.2",
            "baseVersion": "v0.1",
            "status": "draft",
        },
        "nodes": draft_nodes,
        "edges": baseline_edges,
        "publishedSnapshots": [
            {
                "version": "v0.1",
                "schemaVersionId": SCHEMA_VERSION_ID,
                "publishedAt": "2026-07-01T09:00:00+08:00",
                "nodes": baseline_nodes,
                "edges": baseline_edges,
            }
        ],
        "downstreamReferences": [
            {
                "id": "diagnostic-resource2",
                "module": "M5",
                "objectCode": "FINDING-TR2",
                "label": "TR-2 资源适配性诊断",
                "graphVersion": "v0.1",
                "schemaVersionId": SCHEMA_VERSION_ID,
                "nodeIds": ["resource2"],
                "nodeVersionIds": ["resource2@v1.0"],
                "edgeIds": [],
                "edgeVersionIds": [],
                "suggestedAction": "recheck",
            }
        ],
        "changeReviews": [],
        "impactDecisions": [],
    }


def test_graph_workspace_persists_new_ontology_publish_and_revision_lifecycle(
    client: TestClient,
) -> None:
    assert client.get("/api/v1/teaching-graph/workspace").status_code == 404

    initialized = client.put(
        "/api/v1/teaching-graph/workspace",
        json={"expectedRevision": 0, "state": graph_state()},
    )
    assert initialized.status_code == 200
    initialized_state = initialized.json()["state"]
    assert initialized_state["schemaVersionId"] == SCHEMA_VERSION_ID
    assert "evidenceSnapshots" not in initialized_state
    assert {item["type"] for item in initialized_state["nodes"]} >= {
        "course",
        "ability",
        "skill",
        "knowledge",
        "teaching-resource",
    }
    assert initialized_state["nodes"][0]["nodeVersionId"] == "gr1@v1.0"
    assert (
        initialized_state["edges"][0]["sourceNodeVersionId"]
        == "gr1@v1.0"
    )

    blocked = client.post(
        "/api/v1/teaching-graph/workspace/publish",
        json={"expectedRevision": 1},
    )
    assert blocked.status_code == 409
    blockers = blocked.json()["detail"]["blockers"]
    assert "1 项变更尚未逐项审核" in blockers
    assert "1 个下游对象尚未处置" in blockers

    reviewed = graph_state()
    reviewed["changeReviews"] = [
        {
            "changeId": "node:resource2",
            "draftVersion": "v0.2",
            "reviewer": "王老师",
            "decidedAt": "2026-07-29T10:00:00+08:00",
        }
    ]
    reviewed["impactDecisions"] = [
        {
            "referenceId": "diagnostic-resource2",
            "action": "recheck",
            "draftVersion": "v0.2",
            "reviewer": "王老师",
            "decidedAt": "2026-07-29T10:01:00+08:00",
        }
    ]
    saved = client.put(
        "/api/v1/teaching-graph/workspace",
        json={"expectedRevision": 1, "state": reviewed},
    )
    assert saved.status_code == 200
    assert saved.json()["revision"] == 2

    stale = client.put(
        "/api/v1/teaching-graph/workspace",
        json={"expectedRevision": 1, "state": reviewed},
    )
    assert stale.status_code == 409

    published = client.post(
        "/api/v1/teaching-graph/workspace/publish",
        json={"expectedRevision": 2},
    )
    assert published.status_code == 200
    payload = published.json()
    assert payload["revision"] == 3
    assert payload["state"]["version"] == {
        "name": "v0.2",
        "status": "published",
        "baseVersion": None,
    }
    latest_snapshot = payload["state"]["publishedSnapshots"][-1]
    assert latest_snapshot["schemaVersionId"] == SCHEMA_VERSION_ID
    assert any(
        item["nodeVersionId"] == "resource2@v2.0"
        for item in latest_snapshot["nodes"]
    )

    audit = client.get("/api/v1/teaching-graph/audit-events").json()
    assert audit["total"] == 3
    assert audit["items"][0]["action"] == "publish_graph"

    revision = client.post(
        "/api/v1/teaching-graph/workspace/revisions",
        json={"expectedRevision": 3},
    )
    assert revision.status_code == 200
    assert revision.json()["state"]["version"] == {
        "name": "v0.3",
        "baseVersion": "v0.2",
        "status": "draft",
    }

    empty_publish = client.post(
        "/api/v1/teaching-graph/workspace/publish",
        json={"expectedRevision": 4},
    )
    assert empty_publish.status_code == 409
    assert (
        "当前草稿与正式基线无实际差异"
        in empty_publish.json()["detail"]["blockers"]
    )


@pytest.mark.parametrize(
    ("edge_id", "target_id", "target_version_id"),
    [
        ("edge-supports", "gr1", "gr1@v1.0"),
        ("edge-assessment", "co1", "co1@v1.0"),
    ],
)
def test_save_rejects_shortcut_relations(
    client: TestClient,
    edge_id: str,
    target_id: str,
    target_version_id: str,
) -> None:
    state = graph_state()
    invalid_edge = next(item for item in state["edges"] if item["id"] == edge_id)
    invalid_edge["targetId"] = target_id
    invalid_edge["targetNodeVersionId"] = target_version_id

    rejected = client.put(
        "/api/v1/teaching-graph/workspace",
        json={"expectedRevision": 0, "state": state},
    )
    assert rejected.status_code == 409
    assert any(
        "图谱结构不变量未通过" in issue
        for issue in rejected.json()["detail"]["issues"]
    )


@pytest.mark.parametrize(
    (
        "edge_id",
        "relation",
        "source_id",
        "source_version_id",
        "target_id",
        "target_version_id",
    ),
    [
        (
            "edge-belongs-to",
            "belongs-to",
            "course1",
            "course1@v1.0",
            "exp1",
            "exp1@v1.0",
        ),
        (
            "edge-ability-skill",
            "requires",
            "ability1",
            "ability1@v1.0",
            "skill1",
            "skill1@v1.0",
        ),
        (
            "edge-resource-support",
            "enables",
            "resource1",
            "resource1@v1.0",
            "ability1",
            "ability1@v1.0",
        ),
    ],
)
def test_save_enforces_adr_relation_directions(
    client: TestClient,
    edge_id: str,
    relation: str,
    source_id: str,
    source_version_id: str,
    target_id: str,
    target_version_id: str,
) -> None:
    state = graph_state()
    invalid_edge = next(item for item in state["edges"] if item["id"] == edge_id)
    invalid_edge.update(
        {
            "relation": relation,
            "sourceId": source_id,
            "sourceNodeVersionId": source_version_id,
            "targetId": target_id,
            "targetNodeVersionId": target_version_id,
        }
    )

    rejected = client.put(
        "/api/v1/teaching-graph/workspace",
        json={"expectedRevision": 0, "state": state},
    )
    assert rejected.status_code == 409
    assert any(
        "invalid-endpoint-types" in issue
        for issue in rejected.json()["detail"]["issues"]
    )


@pytest.mark.parametrize(
    ("edge_id", "legacy_relation"),
    [
        ("edge-belongs-to", "contains-experiment"),
        ("edge-resource-support", "supports-capability"),
    ],
)
def test_contract_rejects_pre_adr_relation_aliases(
    client: TestClient,
    edge_id: str,
    legacy_relation: str,
) -> None:
    state = graph_state()
    relation = next(item for item in state["edges"] if item["id"] == edge_id)
    relation["relation"] = legacy_relation

    response = client.put(
        "/api/v1/teaching-graph/workspace",
        json={"expectedRevision": 0, "state": state},
    )

    assert response.status_code == 422


def test_save_requires_fixed_endpoint_versions(
    client: TestClient,
) -> None:
    state = graph_state()
    uses_edge = next(item for item in state["edges"] if item["id"] == "edge-uses")
    uses_edge["targetNodeVersionId"] = "resource1@stale"

    rejected = client.put(
        "/api/v1/teaching-graph/workspace",
        json={"expectedRevision": 0, "state": state},
    )
    assert rejected.status_code == 409
    assert any(
        "stale-target-node-version" in issue
        for issue in rejected.json()["detail"]["issues"]
    )


def test_publish_requires_assessment_aggregation_path(
    client: TestClient,
) -> None:
    state = graph_state()
    state["edges"] = [
        item for item in state["edges"] if item["id"] != "edge-aggregation"
    ]
    initialized = client.put(
        "/api/v1/teaching-graph/workspace",
        json={"expectedRevision": 0, "state": state},
    )
    assert initialized.status_code == 200
    blocked = client.post(
        "/api/v1/teaching-graph/workspace/publish",
        json={"expectedRevision": 1},
    )
    assert blocked.status_code == 409
    blockers = blocked.json()["detail"]["blockers"]
    assert "CO-1 缺少直接评价或数值归集路径" in blockers


def test_save_rejects_duplicate_self_and_missing_node_edges(
    client: TestClient,
) -> None:
    state = graph_state()
    duplicate = deepcopy(
        next(item for item in state["edges"] if item["id"] == "edge-covers")
    )
    duplicate["id"] = "edge-covers-copy"
    duplicate["edgeVersionId"] = "edge-covers-copy@v1.0"
    state["edges"].append(duplicate)

    self_edge = next(
        item for item in state["edges"] if item["id"] == "edge-refines"
    )
    self_edge["targetId"] = "gr1"
    self_edge["targetNodeVersionId"] = "gr1@v1.0"

    missing_node = next(
        item for item in state["edges"] if item["id"] == "edge-uses"
    )
    missing_node["targetId"] = "missing-resource"
    missing_node["targetNodeVersionId"] = "missing-resource@v1.0"

    rejected = client.put(
        "/api/v1/teaching-graph/workspace",
        json={"expectedRevision": 0, "state": state},
    )

    assert rejected.status_code == 409
    issues = rejected.json()["detail"]["issues"]
    assert any("duplicate-edge" in issue for issue in issues)
    assert any("self-edge" in issue for issue in issues)
    assert any("missing-node" in issue for issue in issues)


@pytest.mark.parametrize(
    "mapping",
    [
        None,
        {
            "rationale": "映射到不存在的能力行为",
            "targetBehaviors": ["不存在的能力行为"],
        },
    ],
)
def test_supports_requires_valid_capability_mapping(
    client: TestClient,
    mapping: dict[str, Any] | None,
) -> None:
    state = graph_state()
    support = next(item for item in state["edges"] if item["id"] == "edge-supports")
    if mapping is None:
        support.pop("capabilityMapping")
    else:
        support["capabilityMapping"] = mapping

    rejected = client.put(
        "/api/v1/teaching-graph/workspace",
        json={"expectedRevision": 0, "state": state},
    )
    assert rejected.status_code == 409
    assert any(
        (
            "missing-capability-mapping" in issue
            or "unknown-capability-behavior" in issue
        )
        for issue in rejected.json()["detail"]["issues"]
    )


def test_expects_rejects_capability_mapping(client: TestClient) -> None:
    state = graph_state()
    expects = next(item for item in state["edges"] if item["id"] == "edge-expects")
    expects["capabilityMapping"] = {
        "rationale": "不应保存在 EXPECTS 上",
        "targetBehaviors": ["分析算法并形成可验证结论"],
    }

    rejected = client.put(
        "/api/v1/teaching-graph/workspace",
        json={"expectedRevision": 0, "state": state},
    )
    assert rejected.status_code == 409
    assert any(
        "unexpected-capability-mapping" in issue
        for issue in rejected.json()["detail"]["issues"]
    )


def test_publish_requires_formal_ability_semantics(client: TestClient) -> None:
    state = graph_state()
    ability = next(item for item in state["nodes"] if item["id"] == "ability1")
    ability.pop("capability")
    state["edges"] = [
        item for item in state["edges"] if item["id"] != "edge-supports"
    ]

    initialized = client.put(
        "/api/v1/teaching-graph/workspace",
        json={"expectedRevision": 0, "state": state},
    )
    assert initialized.status_code == 200

    blocked = client.post(
        "/api/v1/teaching-graph/workspace/publish",
        json={"expectedRevision": 1},
    )
    assert blocked.status_code == 409
    assert (
        "BA-1 缺少完整能力语义"
        in blocked.json()["detail"]["blockers"]
    )


def test_contract_rejects_m2_evaluation_snapshots_and_unstable_sources(
    client: TestClient,
) -> None:
    legacy_state = graph_state()
    legacy_state["evidenceSnapshots"] = [
        {
            "id": "evaluation-input",
            "sampleSize": 42,
            "inputs": [{"criterionId": "criterion1", "scoreRate": 0.8, "weight": 1}],
        }
    ]
    legacy_response = client.put(
        "/api/v1/teaching-graph/workspace",
        json={"expectedRevision": 0, "state": legacy_state},
    )
    assert legacy_response.status_code == 422

    missing_source_id = graph_state()
    missing_source_id["nodes"][0]["source"].pop("sourceRefId")
    source_response = client.put(
        "/api/v1/teaching-graph/workspace",
        json={"expectedRevision": 0, "state": missing_source_id},
    )
    assert source_response.status_code == 422


def test_new_formal_facts_default_to_draft_and_pending_review(
    client: TestClient,
) -> None:
    state = graph_state()
    resource = next(item for item in state["nodes"] if item["id"] == "resource2")
    resource.pop("status")
    relation = next(item for item in state["edges"] if item["id"] == "edge-refines")
    relation.pop("status")
    relation.pop("reviewStatus")

    response = client.put(
        "/api/v1/teaching-graph/workspace",
        json={"expectedRevision": 0, "state": state},
    )

    assert response.status_code == 200
    payload = response.json()["state"]
    saved_resource = next(
        item for item in payload["nodes"] if item["id"] == "resource2"
    )
    saved_relation = next(
        item for item in payload["edges"] if item["id"] == "edge-refines"
    )
    assert saved_resource["status"] == "draft"
    assert saved_relation["status"] == "draft"
    assert saved_relation["reviewStatus"] == "pending"


def test_client_cannot_rewrite_schema_or_published_snapshots(
    client: TestClient,
) -> None:
    initialized = client.put(
        "/api/v1/teaching-graph/workspace",
        json={"expectedRevision": 0, "state": graph_state()},
    )
    assert initialized.status_code == 200

    changed_schema = graph_state()
    changed_schema["schemaVersionId"] = "teaching-graph-schema@3"
    response = client.put(
        "/api/v1/teaching-graph/workspace",
        json={"expectedRevision": 1, "state": changed_schema},
    )
    assert response.status_code == 422
    persisted = client.get("/api/v1/teaching-graph/workspace")
    assert persisted.status_code == 200
    assert persisted.json()["revision"] == 1
    assert persisted.json()["state"]["schemaVersionId"] == SCHEMA_VERSION_ID

    tampered = graph_state()
    tampered["publishedSnapshots"][0]["nodes"][0]["name"] = "被篡改的历史"
    response = client.put(
        "/api/v1/teaching-graph/workspace",
        json={"expectedRevision": 1, "state": tampered},
    )
    assert response.status_code == 409
    assert response.json()["detail"]["issues"] == ["正式快照不可由客户端改写"]


def test_legacy_workspace_is_migrated_on_read_without_writing_database(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime_dir = tmp_path / "runtime"
    database_path = runtime_dir / "teaching-graph.sqlite3"
    legacy_state = legacy_graph_state()
    legacy_state["schemaVersionId"] = "ability-graph-schema:v1"
    monkeypatch.setenv("EA_LOCAL_DATA_DIR", str(runtime_dir))
    get_settings.cache_clear()
    application = create_app()
    insert_legacy_workspace(database_path, legacy_state)

    with TestClient(application) as test_client:
        first = test_client.get("/api/v1/teaching-graph/workspace")
        second = test_client.get("/api/v1/teaching-graph/workspace")

        assert first.status_code == 200
        assert second.status_code == 200
        assert first.json()["state"] == second.json()["state"]
        migrated = first.json()["state"]
        assert migrated["schemaVersionId"] == SCHEMA_VERSION_ID
        assert "evidenceSnapshots" not in migrated
        assert all(
            "contributionWeight" not in relation
            for relation in migrated["edges"]
        )

        course = next(
            item for item in migrated["nodes"] if item["type"] == "course"
        )
        ability = next(
            item for item in migrated["nodes"] if item["type"] == "ability"
        )
        assert ability["capability"]["observableBehaviors"] == [
            "分析算法并形成可验证结论"
        ]
        assert all(item["nodeVersionId"] for item in migrated["nodes"])
        assert all(item["edgeVersionId"] for item in migrated["edges"])
        assert all(
            item["source"]["sourceRefId"]
            and item["source"]["materialVersionId"]
            and item["source"]["evidenceFragmentId"]
            for item in [*migrated["nodes"], *migrated["edges"]]
        )

        relation_signatures = {
            (item["relation"], item["sourceId"], item["targetId"])
            for item in migrated["edges"]
        }
        assert ("defines", course["id"], "legacy-co") in relation_signatures
        assert ("belongs-to", "legacy-exp", course["id"]) in relation_signatures
        assert ("expects", "legacy-pi", ability["id"]) in relation_signatures
        assert ("cultivates", "legacy-exp", ability["id"]) in relation_signatures
        assert (
            "contributes-to",
            "legacy-criterion",
            "legacy-co",
        ) in relation_signatures
        assert (
            "assesses",
            "legacy-criterion",
            ability["id"],
        ) in relation_signatures
        assert (
            "supports",
            "legacy-co",
            "legacy-go",
        ) not in relation_signatures

        expects = next(
            item for item in migrated["edges"] if item["relation"] == "expects"
        )
        supports = next(
            item for item in migrated["edges"] if item["relation"] == "supports"
        )
        assert expects["capabilityMapping"] is None
        assert supports["capabilityMapping"]["targetBehaviors"] == [
            "分析算法并形成可验证结论"
        ]
        migrated_contribution = next(
            item
            for item in migrated["edges"]
            if item["relation"] == "contributes-to"
            and item["sourceId"] == "legacy-criterion"
        )
        migrated_assessment = next(
            item
            for item in migrated["edges"]
            if item["relation"] == "assesses"
            and item["sourceId"] == "legacy-criterion"
        )
        assert (
            migrated_contribution["status"],
            migrated_contribution["reviewStatus"],
        ) == ("draft", "pending")
        assert (
            migrated_assessment["status"],
            migrated_assessment["reviewStatus"],
        ) == ("draft", "pending")

        snapshot = migrated["publishedSnapshots"][0]
        assert snapshot["schemaVersionId"] == SCHEMA_VERSION_ID
        reference = migrated["downstreamReferences"][0]
        assert reference["schemaVersionId"] == SCHEMA_VERSION_ID
        assert len(reference["nodeVersionIds"]) == 1
        assert len(reference["edgeIds"]) == 2
        assert len(reference["edgeVersionIds"]) == 2

        persisted_after_reads = read_persisted_workspace_state(database_path)
        assert (
            persisted_after_reads["schemaVersionId"]
            == "ability-graph-schema:v1"
        )
        assert "evidenceSnapshots" in persisted_after_reads

        saved = test_client.put(
            "/api/v1/teaching-graph/workspace",
            json={"expectedRevision": 1, "state": migrated},
        )
        assert saved.status_code == 200
        assert saved.json()["revision"] == 2

    persisted_after_save = read_persisted_workspace_state(database_path)
    assert persisted_after_save["schemaVersionId"] == SCHEMA_VERSION_ID
    assert "evidenceSnapshots" not in persisted_after_save
    get_settings.cache_clear()


@pytest.mark.parametrize(
    "schema_version_id",
    ["ability-graph-schema:v1", "future-graph-schema:v9"],
)
def test_initialize_rejects_noncurrent_schema(
    client: TestClient,
    schema_version_id: str,
) -> None:
    state = graph_state()
    state["schemaVersionId"] = schema_version_id

    response = client.put(
        "/api/v1/teaching-graph/workspace",
        json={"expectedRevision": 0, "state": state},
    )

    assert response.status_code == 422
    assert client.get("/api/v1/teaching-graph/workspace").status_code == 404


def test_unknown_persisted_schema_is_blocked_without_database_write(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime_dir = tmp_path / "runtime"
    database_path = runtime_dir / "teaching-graph.sqlite3"
    unknown_state = graph_state()
    unknown_state["schemaVersionId"] = "future-graph-schema:v9"
    monkeypatch.setenv("EA_LOCAL_DATA_DIR", str(runtime_dir))
    get_settings.cache_clear()
    application = create_app()
    insert_legacy_workspace(database_path, unknown_state)

    with TestClient(application) as test_client:
        response = test_client.get("/api/v1/teaching-graph/workspace")
        save = test_client.put(
            "/api/v1/teaching-graph/workspace",
            json={"expectedRevision": 1, "state": graph_state()},
        )

    assert response.status_code == 422
    assert response.json()["detail"] == {
        "code": "unsupported_graph_schema",
        "schemaVersionId": "future-graph-schema:v9",
    }
    assert save.status_code == 422
    assert save.json()["detail"] == response.json()["detail"]
    persisted = read_persisted_workspace_state(database_path)
    assert persisted["schemaVersionId"] == "future-graph-schema:v9"
    get_settings.cache_clear()


def test_legacy_workspace_without_capability_stays_draft_and_publish_blocked(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime_dir = tmp_path / "runtime"
    database_path = runtime_dir / "teaching-graph.sqlite3"
    legacy_state = legacy_graph_state()
    indicator = next(
        item
        for item in legacy_state["nodes"]
        if item["type"] == "performance-indicator"
    )
    indicator.pop("capability")
    snapshot_indicator = next(
        item
        for item in legacy_state["publishedSnapshots"][0]["nodes"]
        if item["type"] == "performance-indicator"
    )
    snapshot_indicator.pop("capability")

    monkeypatch.setenv("EA_LOCAL_DATA_DIR", str(runtime_dir))
    get_settings.cache_clear()
    application = create_app()
    insert_legacy_workspace(database_path, legacy_state)

    with TestClient(application) as test_client:
        response = test_client.get("/api/v1/teaching-graph/workspace")
        assert response.status_code == 200
        migrated = response.json()["state"]
        ability = next(
            item for item in migrated["nodes"] if item["type"] == "ability"
        )
        assert ability["status"] == "draft"
        assert ability["capability"] is None
        assert "待确认" in ability["name"]

        publish = test_client.post(
            "/api/v1/teaching-graph/workspace/publish",
            json={"expectedRevision": 1},
        )
        assert publish.status_code == 409
        blockers = publish.json()["detail"]["blockers"]
        assert f"{ability['code']} 缺少完整能力语义" in blockers

    persisted = read_persisted_workspace_state(database_path)
    assert "schemaVersionId" not in persisted
    get_settings.cache_clear()


def test_graph_workspace_survives_api_restart(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("EA_LOCAL_DATA_DIR", str(tmp_path / "runtime"))
    get_settings.cache_clear()
    with TestClient(create_app()) as first_client:
        initialized = first_client.put(
            "/api/v1/teaching-graph/workspace",
            json={"expectedRevision": 0, "state": graph_state()},
        )
        assert initialized.status_code == 200

    get_settings.cache_clear()
    with TestClient(create_app()) as restarted_client:
        restored = restarted_client.get("/api/v1/teaching-graph/workspace")

    assert restored.status_code == 200
    assert restored.json()["state"]["schemaVersionId"] == SCHEMA_VERSION_ID
    assert restored.json()["state"]["version"]["name"] == "v0.2"
    get_settings.cache_clear()
