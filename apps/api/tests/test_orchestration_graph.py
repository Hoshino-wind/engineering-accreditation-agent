"""多智能体图端到端测试（mock 模式，无需 API key，离线可重复）。

覆盖图谱单一真源（JSON store）的行为：
- 运行暂停于人工审核网关，产出待审核关系；
- 审核通过后运行继续到完成；
- 图谱随运行持久化，模拟重启后新编排器仍能读到；
- 多次上传在同一张图谱上持续生长（不互相覆盖审核结果）；
- 删除课程从权威图谱中移除节点与关联边。
"""

import uuid
from pathlib import Path

import pytest
from app.modules.llm.infra.llm_client import LLMConfig, OpenAICompatibleLLMClient
from app.modules.orchestration.domain.models import RunStatus
from app.modules.orchestration.infra.graph import build_agent_graph


@pytest.fixture(autouse=True)
def _isolate_json_data(monkeypatch, tmp_path) -> None:
    """把 JSON 落盘目录指向临时目录，避免污染 apps/api/data/。"""
    import app.core.json_persistence as jp

    monkeypatch.setattr(jp, "_DATA_DIR", Path(tmp_path))
    yield


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

    return LangGraphAgentOrchestrator(
        llm=llm, rag=None, user_id=f"test-{uuid.uuid4().hex[:8]}"
    )


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
    """删除课程时，对应 Course 节点应从当前图谱中移除。

    节点通过权威存储（JsonGraphStateStore.save）注入——与生产路径一致；
    验证移除后持久化图谱中不再残留 Course 节点与关联边。
    """
    from app.modules.courses.domain.course import Course
    from app.modules.orchestration.infra.seed_graph import build_seed_graph
    from app.modules.orchestration.infra.tools import graph_to_state

    orchestrator = mock_orchestrator

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
    orchestrator._graph_store.save(nodes, edges)

    course = Course(id="course-cs101", code="CS101", name="计算机导论")
    removed = await orchestrator.remove_course(course)
    assert "ext-cs101" in removed

    graph = await orchestrator.get_current_graph()
    course_codes = {n.get("code") for n in graph["nodes"] if n.get("kind") == "Course"}
    assert "CS101" not in course_codes
    assert all(e.get("target") != "ext-cs101" for e in graph["edges"])


async def test_graph_persists_across_restart_and_composes(mock_orchestrator):
    """重启后图谱不丢，且新运行基于已持久化图谱继续生长。

    模拟：第一次运行提取出课程 → 新编排器实例（无任何内存运行）→
    仍能读到相同图谱；第二次运行去重、不产生重复节点。
    """
    from app.modules.orchestration.infra.orchestrator import LangGraphAgentOrchestrator

    orch1 = mock_orchestrator
    run1 = await orch1.start_run(
        goal="首次上传",
        material_category="培养方案",
        material_name="测试培养方案",
    )
    assert run1.status == RunStatus.AWAITING_REVIEW

    user_id = orch1._graph_store._user_id
    graph_after_first = await orch1.get_current_graph()
    codes_after_first = {n.get("code") for n in graph_after_first["nodes"]}
    assert "CO-DS" in codes_after_first  # mock 提取出的课程

    # 模拟重启：同一 user_id 的全新编排器，内存无任何运行
    cfg = LLMConfig()
    cfg.api_key = ""
    llm = OpenAICompatibleLLMClient(config=cfg)
    orch2 = LangGraphAgentOrchestrator(llm=llm, rag=None, user_id=user_id)
    graph_after_restart = await orch2.get_current_graph()
    codes_after_restart = {n.get("code") for n in graph_after_restart["nodes"]}
    assert codes_after_restart == codes_after_first

    # 第二次上传：新运行基于已有图谱生长，按 node code 去重
    run2 = await orch2.start_run(
        goal="第二次上传",
        material_category="培养方案",
        material_name="补充培养方案材料",
    )
    assert run2.status == RunStatus.AWAITING_REVIEW

    final = await orch2.get_current_graph()
    final_codes = [n.get("code") for n in final["nodes"]]
    assert final_codes.count("CO-DS") == 1


async def test_reviewed_edge_not_overwritten_by_new_inference(mock_orchestrator):
    """已审核边不会被后续运行的重复推断覆盖。

    第一次运行（mock 推断同一批关系）→ 全部审核通过 → 第二次运行又
    推断出相同的 (source, target) 关系时，新边必须是独立 id 的 pending
    边，不能覆盖第一次已 approved 的边。
    """
    orch = mock_orchestrator

    run1 = await orch.start_run(
        goal="首次上传",
        material_category="培养方案",
        material_name="培养方案A",
    )
    assert run1.status == RunStatus.AWAITING_REVIEW
    decisions = [{"relation_id": r["id"], "decision": "approved"} for r in run1.pending_review]
    done1 = await orch.resume_review(run1.run_id, decisions)
    assert done1.status == RunStatus.COMPLETED

    graph1 = await orch.get_current_graph()
    approved_edges = [e for e in graph1["edges"] if e.get("reviewStatus") == "approved"]
    assert approved_edges, "首次运行后应存在已批准边"

    # 第二次运行：mock 推断样式同样的关系（重复 source/target）
    run2 = await orch.start_run(
        goal="再次上传",
        material_category="培养方案",
        material_name="培养方案A",
    )
    assert run2.status == RunStatus.AWAITING_REVIEW

    graph2 = await orch.get_current_graph()
    approved_now = [e for e in graph2["edges"] if e.get("reviewStatus") == "approved"]
    pending_now = [e for e in graph2["edges"] if e.get("reviewStatus") == "pending"]

    assert len(approved_now) >= len(approved_edges), "已批准边不能被覆盖或丢失"
    approved_ids = {e["id"] for e in approved_now}
    pending_ids = {e["id"] for e in pending_now}
    assert approved_ids.isdisjoint(pending_ids), "新推断边 id 不得与已审核边冲突"


async def test_recognition_review_projects_into_persisted_graph(mock_orchestrator):
    """识别中心审核闭环冒烟：申报 → 审核采纳 → 投影进权威图谱 → 重启后仍在。

    验证「图谱是审核决策的投影」在生产链路真实生效：
    ReviewCandidate 采纳的关系候选中被投影为 approved / manual 边，
    覆盖度随之提升，且 JSON 权威存储持久化（重启后投影不丢）。
    """
    from app.modules.orchestration.infra.orchestrator import LangGraphAgentOrchestrator
    from app.modules.orchestration.infra.seed_graph import build_seed_graph
    from app.modules.orchestration.infra.tools import graph_to_state
    from app.modules.recognition.application.review_candidate import ReviewCandidate
    from app.modules.recognition.domain.candidate import (
        CandidateReviewStatus,
        RecognitionCandidate,
        RecognitionCandidateRisk,
        RecognitionCandidateType,
    )
    from app.modules.recognition.infra.memory_store import (
        InMemoryCandidateRepository,
    )

    orch = mock_orchestrator

    # 申报：图谱预置一个实验节点 + 一条待审候选
    seed = build_seed_graph()
    nodes, edges = graph_to_state(seed)
    nodes.append(
        {
            "id": "exp-list",
            "kind": "experiment",
            "code": "exp-list",
            "name": "链表实现",
            "origin": "school",
        }
    )
    orch._graph_store.save(nodes, edges)

    candidate = RecognitionCandidate(
        id="cand-e2e-1",
        title="「链表实现」实验支撑能力指标「1-1 工程知识应用」",
        course="数据结构",
        candidate_type=RecognitionCandidateType.RELATION,
        confidence=90,
        risk=RecognitionCandidateRisk.HIGH_IMPACT,
        source_node="链表实现",
        relation="支撑",
        target_node="1-1 工程知识应用",
        explanation="E2E 冒烟候选",
        processor_version="e2e",
        generated_at="2026-08-09 10:00",
    )

    # 申报（入库，待审核）
    repo = InMemoryCandidateRepository(with_seed=False)
    await repo.add(candidate)
    pending = await repo.get_by_id(candidate.id)
    assert pending is not None
    assert pending.review_status == CandidateReviewStatus.PENDING

    # 审核：采纳
    reviewed = await ReviewCandidate(repository=repo).execute(candidate.id, "accept")
    assert reviewed.review_status == CandidateReviewStatus.ACCEPTED

    # 投影（生产链路入口：provide_review_candidate 包装后亦调用此方法）
    merged = await orch.review_project_candidates([reviewed])
    edge = next(
        e
        for e in merged["edges"]
        if e["source"] == "exp-list" and e["target"] == "std-c-01-01"
    )
    assert edge["reviewStatus"] == "approved"
    assert edge["sourceType"] == "manual"
    assert edge["strength"] == "strong"

    # 覆盖度生效：C-01-01 被覆盖
    coverage = await orch.get_current_coverage()
    comp = next(c for c in coverage["competencies"] if c["code"] == "C-01-01")
    assert comp["status"] == "covered"
    assert comp["attainment"] == 1.0

    # 模拟重启：同一 user_id 的新编排器，投影依然在权威存储中
    from app.modules.llm.infra.llm_client import LLMConfig, OpenAICompatibleLLMClient

    cfg = LLMConfig()
    cfg.api_key = ""
    orch2 = LangGraphAgentOrchestrator(
        llm=OpenAICompatibleLLMClient(config=cfg),
        rag=None,
        user_id=orch._graph_store._user_id,
    )
    graph2 = await orch2.get_current_graph()
    survived = [
        e
        for e in graph2["edges"]
        if e["source"] == "exp-list" and e["target"] == "std-c-01-01"
    ]
    assert len(survived) == 1
    assert survived[0]["reviewStatus"] == "approved"


async def test_teacher_overrides_auto_decision_and_graph_follows(mock_orchestrator):
    """教师复核闭环：自动采纳 → 改判驳回 → 图谱降级、覆盖度回落 → 再采纳恢复。

    验证「图谱是识别中心审核决策的投影」在人工干预下同样成立：
    每次裁决（无论自动还是人工）都会覆盖上一次结果，且最终态持久化。
    """
    from app.modules.orchestration.infra.seed_graph import build_seed_graph
    from app.modules.orchestration.infra.tools import graph_to_state
    from app.modules.recognition.domain.candidate import (
        CandidateReviewStatus,
        RecognitionCandidate,
        RecognitionCandidateRisk,
        RecognitionCandidateType,
    )

    orch = mock_orchestrator

    seed = build_seed_graph()
    nodes, edges = graph_to_state(seed)
    nodes.append(
        {
            "id": "exp-list",
            "kind": "experiment",
            "code": "exp-list",
            "name": "链表实现",
            "origin": "school",
        }
    )
    orch._graph_store.save(nodes, edges)

    def _candidate(status: CandidateReviewStatus, generated_at: str) -> RecognitionCandidate:
        return RecognitionCandidate(
            id="cand-override-1",
            title="「链表实现」实验支撑能力指标「1-1 工程知识应用」",
            course="数据结构",
            candidate_type=RecognitionCandidateType.RELATION,
            confidence=90,
            risk=RecognitionCandidateRisk.HIGH_IMPACT,
            source_node="链表实现",
            relation="支撑",
            target_node="1-1 工程知识应用",
            explanation="自动推荐 / 教师复核",
            processor_version="autopilot-v2.0",
            generated_at=generated_at,
            review_status=status,
        )

    async def _edge_status() -> str:
        graph = await orch.get_current_graph()
        edges = [
            e
            for e in graph["edges"]
            if e["source"] == "exp-list" and e["target"] == "std-c-01-01"
        ]
        assert len(edges) == 1
        return edges[0]["reviewStatus"]

    async def _c01() -> dict:
        cov = await orch.get_current_coverage()
        return next(c for c in cov["competencies"] if c["code"] == "C-01-01")

    # ① 自动采纳（autopilot 申报）→ 投影为 approved，指标 covered
    await orch.review_project_candidates(
        [_candidate(CandidateReviewStatus.ACCEPTED, "2026-08-09 09:00")]
    )
    assert await _edge_status() == "approved"
    assert (await _c01())["status"] == "covered"

    # ② 教师复核：改判驳回（后发生覆盖先发生）→ 边 rejected，覆盖回落
    await orch.review_project_candidates(
        [_candidate(CandidateReviewStatus.REJECTED, "2026-08-09 10:00")]
    )
    assert await _edge_status() == "rejected"
    assert (await _c01())["status"] == "gap"

    # ③ 教师再次采纳 → 边恢复 approved，覆盖回升（往返不产生重复边）
    await orch.review_project_candidates(
        [_candidate(CandidateReviewStatus.ACCEPTED, "2026-08-09 11:00")]
    )
    assert await _edge_status() == "approved"
    assert (await _c01())["status"] == "covered"

    # ④ 最终态持久化：重启后有且仅有一条边（无残留重复）
    from app.modules.llm.infra.llm_client import LLMConfig, OpenAICompatibleLLMClient
    from app.modules.orchestration.infra.orchestrator import LangGraphAgentOrchestrator

    cfg = LLMConfig()
    cfg.api_key = ""
    orch2 = LangGraphAgentOrchestrator(
        llm=OpenAICompatibleLLMClient(config=cfg),
        rag=None,
        user_id=orch._graph_store._user_id,
    )
    graph2 = await orch2.get_current_graph()
    final = [
        e
        for e in graph2["edges"]
        if e["source"] == "exp-list" and e["target"] == "std-c-01-01"
    ]
    assert len(final) == 1
    assert final[0]["reviewStatus"] == "approved"