"""多智能体图端到端测试（mock 模式，无需 API key，离线可重复）。"""

import pytest

from app.modules.llm.infra.llm_client import LLMConfig, OpenAICompatibleLLMClient
from app.modules.orchestration.infra.graph import build_agent_graph


@pytest.fixture()
def mock_graph():
    cfg = LLMConfig()
    cfg.api_key = ""  # 强制 mock
    llm = OpenAICompatibleLLMClient(config=cfg)
    return build_agent_graph(llm)


async def test_graph_pauses_at_review(mock_graph):
    """图在 review 节点暂停，产出待审核关系列表。"""
    config = {"configurable": {"thread_id": "test-pause"}}
    await mock_graph.ainvoke(
        {"goal": "测试暂停", "material_category": "培养方案", "material_name": "测试方案"},
        config,
    )
    snapshot = mock_graph.get_state(config)
    # 应有 interrupt
    interrupts = []
    for task in snapshot.tasks:
        if hasattr(task, "interrupts") and task.interrupts:
            for intr in task.interrupts:
                interrupts.append(intr.value)
    assert len(interrupts) == 1
    pending = interrupts[0]["pending_review"]
    assert len(pending) > 0
    # 每条待审核关系应有 id/source/target
    for rel in pending:
        assert "id" in rel
        assert "source" in rel
        assert "target" in rel


async def test_graph_completes_after_review(mock_graph):
    """审核通过后图继续执行到完成，产出覆盖度/建议/报告。"""
    from langgraph.types import Command

    config = {"configurable": {"thread_id": "test-complete"}}
    await mock_graph.ainvoke(
        {"goal": "测试完成", "material_category": "培养方案", "material_name": "测试方案"},
        config,
    )
    # 获取 pending 并全部 approve
    snapshot = mock_graph.get_state(config)
    pending = []
    for task in snapshot.tasks:
        if hasattr(task, "interrupts") and task.interrupts:
            for intr in task.interrupts:
                pending = intr.value.get("pending_review", [])

    decisions = [{"relation_id": r["id"], "decision": "approved"} for r in pending]
    result = await mock_graph.ainvoke(Command(resume=decisions), config)

    # 验证完成
    assert result["phase"] == "report"
    assert len(result["steps"]) == 8  # plan..report

    # 覆盖度非零（seed graph 有结构性 approved 边）
    cov = result["coverage"]
    assert cov["overallCoverageRate"] > 0
    assert cov["coveredCount"] >= 1

    # 有报告章节
    assert len(result["report_chapters"]) >= 1


async def test_graph_reject_all_still_completes(mock_graph):
    """全部驳回后图仍能完成，但覆盖度较低。"""
    from langgraph.types import Command

    config = {"configurable": {"thread_id": "test-reject"}}
    await mock_graph.ainvoke(
        {"goal": "测试驳回", "material_category": "培养方案", "material_name": "测试方案"},
        config,
    )
    snapshot = mock_graph.get_state(config)
    pending = []
    for task in snapshot.tasks:
        if hasattr(task, "interrupts") and task.interrupts:
            for intr in task.interrupts:
                pending = intr.value.get("pending_review", [])

    decisions = [{"relation_id": r["id"], "decision": "rejected"} for r in pending]
    result = await mock_graph.ainvoke(Command(resume=decisions), config)

    assert result["phase"] == "report"
    # 即使 AI 推断被驳回，seed graph 的结构性 approved 边仍提供覆盖
    cov = result["coverage"]
    assert cov["overallCoverageRate"] >= 0
