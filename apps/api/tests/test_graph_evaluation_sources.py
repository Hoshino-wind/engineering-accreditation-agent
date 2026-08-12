"""评价结构来自正式图谱，权重来自评价策略。

改造前评价对象和评分输入都来自手写种子文件，其中 ``graph_version`` 只是字符串。
这组测试守住两件事：结构确实由图谱正式关系派生；权重与结构互不代写。
"""

from decimal import Decimal
from pathlib import Path
from typing import Any

import pytest
from app.core.config import get_settings
from app.factory import create_app
from app.modules.evaluations.domain import (
    EvaluationPolicyBinding,
    EvaluationPolicyVersion,
    bind_evaluation_sources,
    derive_evaluation_structure,
)
from app.modules.evaluations.infra.graph_source_runtime import (
    PilotFileEvaluationPolicyRepository,
    resolve_published_snapshot,
)
from fastapi.testclient import TestClient
from pytest import MonkeyPatch

GRAPH_SOURCES_PATH = "/api/v1/evaluations/graph-sources"


def source_ref(material: str = "数据结构实验评分表", version: str = "v4") -> dict[str, Any]:
    return {
        "sourceRefId": "src-1",
        "materialId": "material-1",
        "materialVersionId": "material-version-1",
        "evidenceFragmentId": "fragment-1",
        "material": material,
        "version": version,
        "coordinate": "第 1 页 / 表 1",
    }


def node(node_id: str, node_type: str, code: str, name: str, **overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "id": node_id,
        "type": node_type,
        "code": code,
        "name": name,
        "definition": f"{name}的定义",
        "nodeVersionId": f"node-version:{node_id}:v1",
        "owner": "王老师",
        "status": "effective",
        "version": "v1.0",
        "source": source_ref(),
    }
    payload.update(overrides)
    return payload


def edge(edge_id: str, relation: str, source_id: str, target_id: str, **overrides: Any) -> dict:
    payload: dict[str, Any] = {
        "id": edge_id,
        "relation": relation,
        "sourceId": source_id,
        "targetId": target_id,
        "edgeVersionId": f"edge-version:{edge_id}:v1",
        "sourceNodeVersionId": f"node-version:{source_id}:v1",
        "targetNodeVersionId": f"node-version:{target_id}:v1",
        "effectiveCycle": "2025-2026-2",
        "reviewStatus": "approved",
        "status": "effective",
        "source": source_ref(),
    }
    payload.update(overrides)
    return payload


def snapshot(**overrides: Any) -> dict[str, Any]:
    """一个最小但完整的已发布快照：课程 → 课程目标 → 指标点 ← 两个评分项。"""
    payload: dict[str, Any] = {
        "version": "v0.4",
        "schemaVersionId": "teaching-graph-schema@2",
        "publishedAt": "2026-07-01T00:00:00Z",
        "nodes": [
            node("course-1", "course", "DS", "数据结构"),
            node("co-1", "course-outcome", "CO-DS-3", "树结构算法设计与分析"),
            node("pi-1", "performance-indicator", "PI-2.1", "分析复杂工程问题"),
            node("ability-1", "ability", "BA-2", "复杂工程问题分析"),
            node("rc-1", "rubric-criterion", "RC-11", "算法正确性"),
            node("rc-2", "rubric-criterion", "RC-12", "复杂度分析"),
        ],
        "edges": [
            edge("e-defines", "defines", "course-1", "co-1"),
            edge("e-supports", "supports", "co-1", "pi-1"),
            edge("e-expects", "expects", "pi-1", "ability-1"),
            edge("e-rc1", "contributes-to", "rc-1", "co-1"),
            edge("e-rc2", "contributes-to", "rc-2", "co-1"),
        ],
    }
    payload.update(overrides)
    return payload


def policy(**overrides: Any) -> EvaluationPolicyVersion:
    defaults: dict[str, Any] = {
        "policy_version": "test-policy-v1",
        "method": "mean_score_ratio",
        "missing_score": "exclude",
        "score_rate_scale": 3,
        "threshold": Decimal("0.70"),
        "bindings": (
            EvaluationPolicyBinding("co-1", "rc-1", "edge-version:e-rc1:v1", Decimal("0.60")),
            EvaluationPolicyBinding("co-1", "rc-2", "edge-version:e-rc2:v1", Decimal("0.40")),
        ),
    }
    defaults.update(overrides)
    return EvaluationPolicyVersion(**defaults)


def bind(snapshot_payload: dict[str, Any], policy_version: EvaluationPolicyVersion):
    return bind_evaluation_sources(
        derive_evaluation_structure(snapshot_payload), policy_version
    )


# --------------------------------------------------------------------------
# 结构派生
# --------------------------------------------------------------------------


def test_structure_comes_from_formal_relations() -> None:
    structure = derive_evaluation_structure(snapshot())

    assert structure.graph_version == "v0.4"
    assert len(structure.targets) == 1
    target = structure.targets[0]
    assert target.ready
    assert target.objective_code == "CO-DS-3"
    assert target.course_name == "数据结构"
    assert target.indicator_code == "PI-2.1"
    # 能力沿 指标点 --expects--> 能力 解析。
    assert target.ability_code == "BA-2"
    assert [item.criterion_id for item in target.criteria] == ["rc-1", "rc-2"]


def test_ability_falls_back_to_indicator_without_ability_layer() -> None:
    """最小本体子集没有 ability 节点，此时回落到指标点，而不是留空。"""
    payload = snapshot(
        nodes=[item for item in snapshot()["nodes"] if item["id"] != "ability-1"],
        edges=[item for item in snapshot()["edges"] if item["id"] != "e-expects"],
    )

    target = derive_evaluation_structure(payload).targets[0]

    assert target.ability_code == "PI-2.1"
    assert target.ready


def test_missing_supports_edge_blocks_the_target() -> None:
    payload = snapshot(
        edges=[item for item in snapshot()["edges"] if item["id"] != "e-supports"]
    )

    target = derive_evaluation_structure(payload).targets[0]

    assert not target.ready
    assert any("supports" in item for item in target.blockers)


def test_missing_contributes_to_blocks_the_target() -> None:
    payload = snapshot(
        edges=[
            item
            for item in snapshot()["edges"]
            if item["relation"] != "contributes-to"
        ]
    )

    target = derive_evaluation_structure(payload).targets[0]

    assert not target.ready
    assert any("contributes-to" in item for item in target.blockers)


def test_pending_edges_are_not_formal_facts() -> None:
    """待审关系不构成正式事实，不能进入评价结构。"""
    edges = [
        {**item, "reviewStatus": "pending"} if item["id"] == "e-rc1" else item
        for item in snapshot()["edges"]
    ]

    target = derive_evaluation_structure(snapshot(edges=edges)).targets[0]

    assert [item.criterion_id for item in target.criteria] == ["rc-2"]


def test_superseded_nodes_are_excluded() -> None:
    nodes = [
        {**item, "status": "superseded"} if item["id"] == "rc-1" else item
        for item in snapshot()["nodes"]
    ]

    target = derive_evaluation_structure(snapshot(nodes=nodes)).targets[0]

    assert [item.criterion_id for item in target.criteria] == ["rc-2"]


def test_criterion_without_source_material_is_blocked() -> None:
    nodes = [
        {**item, "source": {**source_ref(), "material": "", "version": ""}}
        if item["id"] == "rc-1"
        else item
        for item in snapshot()["nodes"]
    ]

    target = derive_evaluation_structure(snapshot(nodes=nodes)).targets[0]

    assert not target.ready
    assert any("来源材料" in item for item in target.blockers)


# --------------------------------------------------------------------------
# 策略绑定
# --------------------------------------------------------------------------


def test_weights_come_from_policy_not_from_the_graph() -> None:
    """图谱里没有任何权重字段；权重只能来自策略版本。"""
    graph_text = str(snapshot())

    assert "weight" not in graph_text

    source = bind(snapshot(), policy())[0]

    assert source.ready
    assert [item.weight for item in source.criteria] == [Decimal("0.60"), Decimal("0.40")]
    assert source.policy_version == "test-policy-v1"
    assert source.threshold == Decimal("0.70")


def test_unbound_criterion_blocks_the_source() -> None:
    partial = policy(
        bindings=(
            EvaluationPolicyBinding("co-1", "rc-1", "edge-version:e-rc1:v1", Decimal("1.00")),
        )
    )

    source = bind(snapshot(), partial)[0]

    assert not source.ready
    assert any("没有权重绑定" in item for item in source.blockers)


def test_weights_must_close_to_one() -> None:
    unbalanced = policy(
        bindings=(
            EvaluationPolicyBinding("co-1", "rc-1", "edge-version:e-rc1:v1", Decimal("0.60")),
            EvaluationPolicyBinding("co-1", "rc-2", "edge-version:e-rc2:v1", Decimal("0.50")),
        )
    )

    source = bind(snapshot(), unbalanced)[0]

    assert not source.ready
    assert any("必须等于 1" in item for item in source.blockers)


def test_stale_edge_version_binding_is_blocked_not_silently_reused() -> None:
    """图谱升了关系版本而策略没跟上时必须阻断。

    沿用旧权重会得到一个看起来正常、却无法追溯到任何正式关系版本的达成度。
    """
    edges = [
        {**item, "edgeVersionId": "edge-version:e-rc1:v2"} if item["id"] == "e-rc1" else item
        for item in snapshot()["edges"]
    ]

    source = bind(snapshot(edges=edges), policy())[0]

    assert not source.ready
    assert any("关系版本" in item for item in source.blockers)


def test_duplicate_binding_is_rejected_by_the_policy_model() -> None:
    with pytest.raises(ValueError, match="不得重复"):
        policy(
            bindings=(
                EvaluationPolicyBinding("co-1", "rc-1", "edge-version:e-rc1:v1", Decimal("0.5")),
                EvaluationPolicyBinding("co-1", "rc-1", "edge-version:e-rc1:v1", Decimal("0.5")),
            )
        )


# --------------------------------------------------------------------------
# 快照解析与试点策略文件
# --------------------------------------------------------------------------


def test_draft_resolves_to_its_baseline_not_to_the_draft_itself() -> None:
    """草稿尚未发布，评价必须读它的基线版本。"""
    state = {
        "version": {"name": "v0.5", "baseVersion": "v0.4", "status": "draft"},
        "publishedSnapshots": [{"version": "v0.4", "nodes": [], "edges": []}],
    }

    assert resolve_published_snapshot(state) == {"version": "v0.4", "nodes": [], "edges": []}


def test_no_published_snapshot_resolves_to_none() -> None:
    state = {
        "version": {"name": "v0.1", "baseVersion": "", "status": "draft"},
        "publishedSnapshots": [],
    }

    assert resolve_published_snapshot(state) is None


def test_pilot_policy_file_is_loadable_and_closed() -> None:
    """随代码发布的试点策略必须可载入，且每个课程目标权重闭合。"""
    import asyncio

    loaded = asyncio.run(PilotFileEvaluationPolicyRepository().get_active_policy())

    assert loaded is not None
    totals: dict[str, Decimal] = {}
    for binding in loaded.bindings:
        totals[binding.course_outcome_id] = (
            totals.get(binding.course_outcome_id, Decimal(0)) + binding.weight
        )
    for outcome_id, total in totals.items():
        assert total == Decimal("1.00"), f"{outcome_id} 权重合计为 {total}"


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


def test_endpoint_reports_owner_when_no_graph_is_published(client: TestClient) -> None:
    """图谱未发布时返回 409 并指明责任模块，而不是返回空列表。

    空列表会被读成"没有可评价对象"，而事实是"结构还没建"。
    """
    response = client.get(GRAPH_SOURCES_PATH)

    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["code"] == "published_graph_unavailable"
    assert detail["owner"] == "M2"


def test_endpoint_is_exposed_in_the_openapi_contract(client: TestClient) -> None:
    schema = client.app.openapi()

    assert GRAPH_SOURCES_PATH in schema["paths"]
    assert set(schema["paths"][GRAPH_SOURCES_PATH]) == {"get"}
    source_schema = schema["components"]["schemas"]["GraphEvaluationSourceResponse"]
    assert source_schema["additionalProperties"] is False
    assert "policyVersion" in source_schema["properties"]
    assert "graphVersion" in source_schema["properties"]
