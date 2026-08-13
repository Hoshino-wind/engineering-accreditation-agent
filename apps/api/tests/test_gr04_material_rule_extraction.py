from app.modules.llm.infra.mock_data import (
    get_mock_extraction_items,
    get_mock_relation_items,
)
from app.modules.llm.infra.llm_client import LLMConfig, OpenAICompatibleLLMClient
from app.modules.orchestration.domain.models import RunStatus
from app.modules.orchestration.infra.orchestrator import LangGraphAgentOrchestrator
from app.modules.orchestration.infra.seed_graph import build_seed_graph
from app.modules.orchestration.infra.tools import (
    graph_to_state,
    relations_to_pending_edges,
    standard_node_dicts,
)

import pytest


def test_gr04_c0401_material_extracts_targeted_support_relation() -> None:
    material_text = """
    材料名称：嵌入式系统原理课程研究型实验指导书
    毕业要求：GR-04 研究
    能力指标：C-04-01 4-1 实验方案设计
    评分项 R2：实验方案完整性，支撑强度：强支撑。
    """
    extracted = get_mock_extraction_items(
        "其他",
        "gr04_research_c04_01_experiment_design_support.txt",
        material_text,
    )

    assert any(item.code == "EXP-C04-01" and item.kind == "experiment" for item in extracted)

    seed_nodes, _ = graph_to_state(build_seed_graph())
    school_nodes = [
        {
            "id": f"ext-{item.code.lower()}",
            "code": item.code,
            "name": item.name,
            "kind": "Experiment" if item.kind == "experiment" else "Course",
            "origin": "school",
            "description": item.description,
            "properties": {"sourceExcerpt": item.source_excerpt},
        }
        for item in extracted
    ]
    nodes = seed_nodes + school_nodes
    relations = get_mock_relation_items(school_nodes, standard_node_dicts(nodes))
    pending_edges = relations_to_pending_edges(relations, nodes)

    assert any(
        edge["source"] == "ext-exp-c04-01"
        and edge["target"] == "std-c-04-01"
        and edge["strength"] == "strong"
        for edge in pending_edges
    )


@pytest.mark.asyncio
async def test_gr04_experiment_is_attached_to_course_in_graph(monkeypatch, tmp_path) -> None:
    import app.core.json_persistence as jp

    monkeypatch.setattr(jp, "_DATA_DIR", tmp_path)
    cfg = LLMConfig()
    cfg.api_key = ""
    orchestrator = LangGraphAgentOrchestrator(
        llm=OpenAICompatibleLLMClient(config=cfg),
        rag=None,
        user_id="gr04-structure",
    )

    run = await orchestrator.start_run(
        goal="分析嵌入式系统原理课程对 C-04-01 实验方案设计的支撑",
        material_category="实验指导书",
        material_name="gr04_research_c04_01_experiment_design_support.txt",
        material_text="""
        课程名称：嵌入式系统原理
        毕业要求：GR-04 研究
        能力指标：C-04-01 4-1 实验方案设计
        评分项 R2：实验方案完整性，支撑强度：强支撑。
        """,
    )

    assert run.status == RunStatus.AWAITING_REVIEW
    graph = await orchestrator.get_current_graph()
    assert any(
        edge["kind"] == "BELONGS_TO"
        and edge["source"] == "ext-exp-c04-01"
        and edge["target"] == "ext-co-es"
        and edge["reviewStatus"] == "approved"
        for edge in graph["edges"]
    )
    assert any(
        edge["kind"] == "SUPPORTS"
        and edge["source"] == "ext-exp-c04-01"
        and edge["target"] == "std-c-04-01"
        and edge["reviewStatus"] == "pending"
        for edge in graph["edges"]
    )
