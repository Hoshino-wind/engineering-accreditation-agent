from pathlib import Path

import pytest

from app.modules.llm.domain.models import LLMResponse, LLMUsage, RelationItem
from app.modules.llm.infra.llm_client import LLMConfig, OpenAICompatibleLLMClient
from app.modules.llm.infra.mock_data import (
    get_evidence_relation_items,
    get_mock_extraction_items,
    get_mock_relation_items,
)
from app.modules.orchestration.domain.coverage import analyze_coverage
from app.modules.orchestration.domain.models import AbilityGraph
from app.modules.orchestration.infra.graph import build_agent_graph
from app.modules.orchestration.infra.graph import _limit_review_relations
from app.modules.orchestration.infra.seed_graph import build_seed_graph
from app.modules.orchestration.infra.tools import (
    graph_to_state,
    relations_to_pending_edges,
    standard_node_dicts,
    state_to_graph,
)


STANDARD_NODES = [
    {"kind": "competency", "code": code}
    for code in [
        "C-01-01",
        "C-02-01",
        "C-03-01",
        "C-03-02",
        "C-04-01",
        "C-04-02",
        "C-05-01",
    ]
]


def _target_codes_for_demo_folder(folder_name: str) -> set[str]:
    base = Path(__file__).parents[3] / "demo-materials" / "embedded-systems-staged-coverage"
    school_nodes = []
    for path in sorted((base / folder_name).iterdir()):
        if not path.is_file():
            continue
        items = get_mock_extraction_items(
            material_category="演示材料",
            material_name=path.name,
            material_text=path.read_text(encoding="utf-8"),
        )
        for item in items:
            school_nodes.append(
                {
                    "id": item.code,
                    "code": item.code,
                    "name": item.name,
                    "kind": item.kind,
                    "description": item.description,
                    "properties": {"sourceExcerpt": item.source_excerpt},
                }
            )
    return {
        relation.target_id
        for relation in get_mock_relation_items(school_nodes, STANDARD_NODES)
    }


def test_first_batch_keeps_research_and_data_analysis_gaps() -> None:
    assert _target_codes_for_demo_folder("01-first-upload-incomplete") == {
        "C-01-01",
        "C-02-01",
        "C-03-01",
        "C-05-01",
    }


def test_second_batch_completes_missing_targets() -> None:
    assert _target_codes_for_demo_folder("02-second-upload-supplement") == {
        "C-01-01",
        "C-02-01",
        "C-03-01",
        "C-03-02",
        "C-04-01",
        "C-04-02",
        "C-05-01",
    }


def _approved_graph_for_demo_folders(folder_names: list[str]) -> AbilityGraph:
    base = Path(__file__).parents[3] / "demo-materials" / "embedded-systems-staged-coverage"
    nodes, edges = graph_to_state(build_seed_graph())
    node_codes = {
        str(node.get("code") or "").strip().lower()
        for node in nodes
        if node.get("code")
    }

    for folder_name in folder_names:
        for path in sorted((base / folder_name).iterdir()):
            if not path.is_file():
                continue
            items = get_mock_extraction_items(
                material_category="演示材料",
                material_name=path.name,
                material_text=path.read_text(encoding="utf-8"),
            )
            current_school_nodes = []
            for item in items:
                if item.kind == "course":
                    continue
                node_id = f"ext-{item.code.lower()}"
                node = {
                    "id": node_id,
                    "code": item.code,
                    "name": item.name,
                    "kind": "Experiment",
                    "origin": "school",
                    "description": item.description,
                    "properties": {
                        "sourceExcerpt": item.source_excerpt,
                        "materialName": path.name,
                        "materialId": path.as_posix(),
                    },
                }
                current_school_nodes.append(node)
                code_key = item.code.lower()
                if code_key not in node_codes:
                    nodes.append(node)
                    node_codes.add(code_key)

            relations = get_mock_relation_items(
                current_school_nodes,
                standard_node_dicts(nodes),
            )
            pending = relations_to_pending_edges(relations, nodes)
            for edge in pending:
                edge["reviewStatus"] = "approved"
                edge["materialResourceId"] = path.as_posix()
                edge["materialName"] = path.name
            edges.extend(pending)

    return state_to_graph(nodes, edges)


def test_staged_demo_matches_current_coverage_thresholds() -> None:
    first_report = analyze_coverage(
        _approved_graph_for_demo_folders(["01-first-upload-incomplete"])
    )
    first_status = {item.code: item.status for item in first_report.competencies}

    assert first_status == {
        "C-01-01": "partial",
        "C-02-01": "partial",
        "C-03-01": "partial",
        "C-03-02": "gap",
        "C-04-01": "gap",
        "C-04-02": "gap",
        "C-05-01": "partial",
    }

    completed_report = analyze_coverage(
        _approved_graph_for_demo_folders([
            "01-first-upload-incomplete",
            "02-second-upload-supplement",
        ])
    )

    assert completed_report.covered_count == 7
    assert completed_report.gap_count == 0
    assert completed_report.partial_count == 0
    assert completed_report.overall_coverage_rate == 1.0
    assert all(
        item.evidence_source_count >= 2 and item.total_strength >= 4
        for item in completed_report.competencies
    )


def _nodes_for_demo_file(relative_path: str) -> list[dict]:
    base = Path(__file__).parents[3] / "demo-materials" / "embedded-systems-staged-coverage"
    path = base / relative_path
    items = get_mock_extraction_items(
        material_category="演示材料",
        material_name=path.name,
        material_text=path.read_text(encoding="utf-8"),
    )
    return [
        {
            "id": item.code,
            "code": item.code,
            "name": item.name,
            "kind": item.kind,
            "description": item.description,
            "properties": {"sourceExcerpt": item.source_excerpt},
        }
        for item in items
    ]


def test_evidence_fallback_does_not_fabricate_unrelated_relations() -> None:
    school_nodes = [
        {
            "id": "exp-generic",
            "code": "EXP-GENERIC",
            "name": "基础操作实验",
            "kind": "experiment",
            "description": "完成基础操作并提交报告。",
            "properties": {},
        }
    ]
    assert get_evidence_relation_items(school_nodes, STANDARD_NODES) == []


@pytest.mark.asyncio
async def test_failed_llm_uses_explicit_evidence_for_review_relations(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    config = LLMConfig()
    config.api_key = "sk-test"
    client = OpenAICompatibleLLMClient(config=config)

    async def fail_chat(*_args, **_kwargs):
        raise UnicodeEncodeError("ascii", "中文占位 Key", 0, 1, "invalid key")

    monkeypatch.setattr(client, "_call_chat", fail_chat)
    school_nodes = _nodes_for_demo_file(
        "01-first-upload-incomplete/02_basic_lab_tasks_partial.csv"
    )

    response = await client.infer_relations(school_nodes, STANDARD_NODES)

    assert {item.target_id for item in response.data} == {
        "C-01-01",
        "C-02-01",
        "C-03-01",
        "C-05-01",
    }
    assert all(item.strength == "strong" for item in response.data)
    assert response.model.startswith("evidence-rules")


@pytest.mark.asyncio
async def test_failed_llm_without_explicit_evidence_is_reported(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    config = LLMConfig()
    config.api_key = "sk-test"
    client = OpenAICompatibleLLMClient(config=config)

    async def fail_chat(*_args, **_kwargs):
        raise RuntimeError("network unavailable")

    monkeypatch.setattr(client, "_call_chat", fail_chat)
    with pytest.raises(RuntimeError, match="关系推断失败"):
        await client.infer_relations(
            [
                {
                    "id": "exp-generic",
                    "code": "EXP-GENERIC",
                    "name": "基础操作实验",
                    "kind": "experiment",
                    "description": "完成基础操作并提交报告。",
                    "properties": {},
                }
            ],
            STANDARD_NODES,
        )


@pytest.mark.asyncio
async def test_material_with_experiments_filters_course_and_foreign_relations(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    config = LLMConfig()
    config.api_key = ""
    client = OpenAICompatibleLLMClient(config=config)

    async def mixed_relations(*_args, **_kwargs):
        return LLMResponse(
            data=[
                RelationItem(
                    source_id="CO-ES",
                    target_id="C-04-01",
                    relation_type="SUPPORTS",
                    strength="strong",
                    confidence=0.95,
                    reasoning="课程级泛化关系不应进入审核",
                ),
                RelationItem(
                    source_id="EXP-DEMO-C01-01",
                    target_id="C-01-01",
                    relation_type="SUPPORTS",
                    strength="strong",
                    confidence=0.95,
                    reasoning="材料中的明确实验证据",
                ),
                RelationItem(
                    source_id="EXP-FROM-OLD-MATERIAL",
                    target_id="C-02-01",
                    relation_type="SUPPORTS",
                    strength="strong",
                    confidence=0.95,
                    reasoning="其他材料的节点不应进入本次审核",
                ),
            ],
            model="test-model",
            usage=LLMUsage(0, 0, 0),
            latency=1,
        )

    monkeypatch.setattr(client, "infer_relations", mixed_relations)
    graph = build_agent_graph(client)
    config_dict = {"configurable": {"thread_id": "filter-material-relations"}}
    material_path = (
        Path(__file__).parents[3]
        / "demo-materials"
        / "embedded-systems-staged-coverage"
        / "01-first-upload-incomplete"
        / "02_basic_lab_tasks_partial.csv"
    )

    await graph.ainvoke(
        {
            "goal": "验证材料关系过滤",
            "material_category": "实验项目清单",
            "material_name": material_path.stem,
            "material_text": material_path.read_text(encoding="utf-8"),
            "material_resource_id": "resource-filter-test",
        },
        config_dict,
    )
    snapshot = graph.get_state(config_dict)
    pending = [
        relation
        for task in snapshot.tasks
        for interruption in getattr(task, "interrupts", [])
        for relation in interruption.value.get("pending_review", [])
    ]

    assert len(pending) == 1
    assert pending[0]["source"].endswith("exp-demo-c01-01")
    assert pending[0]["target"] == "std-c-01-01"


def test_relation_queue_is_deduplicated_and_bounded_per_experiment() -> None:
    source_nodes = [
        {
            "id": "exp-semantic",
            "kind": "experiment",
            "name": "综合设计实验",
            "description": "完成系统设计、测试和结果分析",
        }
    ]
    relations = [
        RelationItem("exp-semantic", "C-01-01", "SUPPORTS", "medium", 0.82, "a"),
        RelationItem("exp-semantic", "C-01-01", "SUPPORTS", "strong", 0.91, "duplicate"),
        RelationItem("exp-semantic", "C-02-01", "SUPPORTS", "medium", 0.88, "b"),
        RelationItem("exp-semantic", "C-03-01", "SUPPORTS", "medium", 0.80, "c"),
        RelationItem("exp-semantic", "C-04-01", "SUPPORTS", "weak", 0.60, "low"),
    ]

    kept = _limit_review_relations(relations, source_nodes)

    assert [(item.target_id, item.confidence) for item in kept] == [
        ("C-01-01", 0.91),
        ("C-02-01", 0.88),
    ]


def test_explicit_indicator_references_are_not_truncated() -> None:
    source_nodes = [
        {
            "id": "exp-explicit",
            "kind": "experiment",
            "name": "认证证据实验",
            "properties": {
                "sourceExcerpt": "本实验明确支撑 C-01-01、C-03-01 和 C-04-02"
            },
        }
    ]
    relations = [
        RelationItem("exp-explicit", code, "SUPPORTS", "strong", 0.95, "explicit")
        for code in ("C-01-01", "C-03-01", "C-04-02")
    ]

    kept = _limit_review_relations(relations, source_nodes)

    assert {item.target_id for item in kept} == {"C-01-01", "C-03-01", "C-04-02"}
