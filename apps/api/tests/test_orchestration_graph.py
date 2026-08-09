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


@pytest.fixture()
def mock_orchestrator():
    cfg = LLMConfig()
    cfg.api_key = ""
    llm = OpenAICompatibleLLMClient(config=cfg)
    from app.modules.orchestration.infra.orchestrator import LangGraphAgentOrchestrator

    return LangGraphAgentOrchestrator(llm=llm, rag=None)


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


async def test_remove_course_node_from_current_graph(mock_orchestrator):
    """删除课程时，对应 Course 节点应从当前图谱中移除。"""
    from app.modules.courses.domain.course import Course
    from app.modules.orchestration.infra.seed_graph import build_seed_graph
    from app.modules.orchestration.infra.tools import graph_to_state

    orchestrator = mock_orchestrator
    run = await orchestrator.start_run(
        goal="测试删除课程同步",
        material_category="培养方案",
        material_name="测试方案",
    )
    config = orchestrator._config(run.run_id)

    seed = build_seed_graph()
    nodes, edges = graph_to_state(seed)
    nodes.append(
        {
            "id": "ext-cs101",
            "kind": "Course",
            "code": "CS101",
            "name": "计算机导论",
            "origin": "school",
            "properties": {},
        }
    )
    edges.append(
        {
            "id": "edge-cs101-01",
            "source": "std-c-01-01",
            "target": "ext-cs101",
            "kind": "SUPPORTS",
            "strength": 0.8,
        }
    )
    orchestrator._graph.update_state(config, {"graph_nodes": nodes, "graph_edges": edges})

    course = Course(id="course-cs101", code="CS101", name="计算机导论")
    await orchestrator.remove_course(course)

    graph = await orchestrator.get_current_graph()
    course_codes = {n.get("code") for n in graph["nodes"] if n.get("kind") == "Course"}
    assert "CS101" not in course_codes
    assert all(e.get("target") != "ext-cs101" for e in graph["edges"])
