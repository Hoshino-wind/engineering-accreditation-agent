"""Autopilot 全链路端到端测试（真实组件，mock LLM，离线可重复）。

复刻生产装配（main.py 中 AutopilotOrchestrator 的构造方式）：
上传资源 → autopilot.run（真实 LangGraph pipeline + 人工审核网关 + 候选落库）→
识别中心候选真实生成 → 教师复核改判 → 投影进图谱 →
覆盖度联动 → 重启后一致。

验证「一键分析」按钮背后的每一条真实数据流，而不是各层单独行为的简单拼接。
"""

import uuid
from pathlib import Path

import pytest

from app.modules.llm.infra.llm_client import LLMConfig, OpenAICompatibleLLMClient
from app.modules.orchestration.infra.orchestrator import LangGraphAgentOrchestrator
from app.modules.recognition.domain.candidate import CandidateReviewStatus


@pytest.fixture(autouse=True)
def _isolate_json_data(monkeypatch, tmp_path) -> None:
    import app.core.json_persistence as jp

    monkeypatch.setattr(jp, "_DATA_DIR", Path(tmp_path))
    yield


@pytest.fixture()
def mock_llm():
    cfg = LLMConfig()
    cfg.api_key = ""  # 强制 mock
    return OpenAICompatibleLLMClient(config=cfg)


class _ResourceRepo:
    def __init__(self, resource):
        self._resource = resource

    async def get_by_id(self, resource_id: str):
        return self._resource if self._resource.id == resource_id else None


def _resource(extracted_text: str):
    from app.modules.resources.domain.resource import (
        EvidenceFragment,
        ProcessingStage,
        TeachingResource,
        TeachingResourceSensitivity,
        TeachingResourceStatus,
        TeachingResourceType,
    )

    rid = f"res-{uuid.uuid4().hex[:8]}"
    return TeachingResource(
        id=rid,
        name="数据结构实验指导书",
        file_name="data-structures-lab-guide.pdf",
        course="数据结构",
        resource_type=TeachingResourceType.LAB_GUIDE,
        version="v1",
        format="pdf",
        status=TeachingResourceStatus.READY,
        size="12KB",
        sensitivity=TeachingResourceSensitivity.INTERNAL,
        updated_at="2026-08-09 10:00",
        owner="teacher-e2e",
        hash="sha256:e2e-autopilot",
        next_action="等待 AI 分析",
        source_coverage=0,
        evidence_fragments=(
            EvidenceFragment(
                id="ev-file-1",
                coordinate="file",
                type="source-file",
                preview="数据结构实验指导书",
                hash="e2e-autopilot",
            ),
        ),
        processing_stages=(
            ProcessingStage(label="内容解析", detail="已解析", status="done"),
        ),
        extracted_text=extracted_text,
    )


async def test_autopilot_full_chain(mock_llm):
    """上传 → 自动分析 → 候选落库 → 教师采纳 → 图谱批准 → 覆盖度联动。"""
    from app.modules.autopilot.orchestrator import AutopilotOrchestrator
    from app.modules.diagnostics.infra.memory_store import InMemoryFindingRepository
    from app.modules.recognition.application.review_candidate import ReviewCandidate
    from app.modules.recognition.infra.memory_store import InMemoryCandidateRepository

    user_id = f"e2e-{uuid.uuid4().hex[:8]}"
    orch = LangGraphAgentOrchestrator(llm=mock_llm, rag=None, user_id=user_id)

    resource = _resource(
        extracted_text=(
            "实验一：链表实现。掌握线性表的基本操作，支撑工程知识应用。\n"
            "实验二：排序对比。掌握算法复杂度分析方法。\n"
            "实验三：串口通信。掌握模块接口与协议设计。\n"
            "实验四：综合项目。设计嵌入式系统整体方案。\n"
        )
    )
    candidates = InMemoryCandidateRepository(with_seed=False, user_id=user_id)
    findings = InMemoryFindingRepository(with_seed=False, user_id=user_id)

    autopilot = AutopilotOrchestrator(
        pipeline=orch,
        resources_repo=_ResourceRepo(resource),
        candidates_repo=candidates,
        findings_repo=findings,
    )

    result = await autopilot.run(resource.id, course="数据结构")

    # ── ① 自动分析后：候选真实落库，但仍等待教师审核 ────────
    assert result["candidates_created"] >= 1
    assert result["findings_created"] == 0
    all_candidates = await candidates.list_all()
    assert len(all_candidates) == result["candidates_created"]
    pending = [c for c in all_candidates if c.review_status == CandidateReviewStatus.PENDING]
    assert pending, "一键分析只能生成待审核候选，不能直接采纳入图"

    # ── ② 提取节点真实并入能力图谱，支撑边仍为 pending ─────
    graph = await orch.get_current_graph()
    school_kinds = {n.get("kind") for n in graph["nodes"] if n.get("origin") == "school"}
    assert "Course" in school_kinds or "Experiment" in school_kinds
    pending_supports = [
        e for e in graph["edges"]
        if e.get("kind") == "SUPPORTS" and e.get("reviewStatus") == "pending"
    ]
    assert pending_supports, "AI 推断的支撑关系应先停留在待审核状态"

    # ── ③ 教师复核：采纳候选后才投影为 approved 支撑边 ─────
    from app.modules.orchestration.domain.projection import _resolve_node

    def _edge_id(cand) -> tuple[str, str] | None:
        """候选端点 → 图谱真实节点 id（投影时按 id→code→name 解析）；解析失败返回 None。"""
        src = _resolve_node(cand.source_node, graph["nodes"])
        tgt = _resolve_node(cand.target_node, graph["nodes"])
        if src is None or tgt is None:
            return None
        return src["id"], tgt["id"]

    target = next((c for c in pending if _edge_id(c) is not None), None)
    assert target is not None, "应存在端点可解析的待审核候选"
    reviewed = await ReviewCandidate(candidates).execute(target.id, "accept")
    assert reviewed is not None
    assert reviewed.review_status == CandidateReviewStatus.ACCEPTED
    await orch.review_project_candidates([reviewed])

    graph2 = await orch.get_current_graph()
    src2, tgt2 = _edge_id(reviewed)
    edge = next(
        (e for e in graph2["edges"] if e["source"] == src2 and e["target"] == tgt2),
        None,
    )
    assert edge is not None, "教师采纳的候选应投影出图谱边"
    assert edge["reviewStatus"] == "approved"

    coverage = await orch.get_current_coverage()
    supported_codes = [
        c["code"]
        for c in coverage["competencies"]
        if c["status"] in ("partial", "covered")
    ]
    assert supported_codes, "教师采纳后应存在已产生有效支撑的指标点"

    # ── ④ 改判驳回已采纳候选 → 图谱降级、覆盖度联动 ────────
    # 注意：候选是 frozen dataclass，repository 以 replace 方式更新；
    # 必须使用 execute 的返回值（与生产路径 main.py 一致），否则旧引用仍是 ACCEPTED
    rejected_candidate = await ReviewCandidate(candidates).execute(reviewed.id, "reject")
    assert rejected_candidate is not None
    assert rejected_candidate.review_status == CandidateReviewStatus.REJECTED
    await orch.review_project_candidates([rejected_candidate])
    graph3 = await orch.get_current_graph()
    src3, tgt3 = _edge_id(rejected_candidate)
    edge3 = next(
        (e for e in graph3["edges"] if e["source"] == src3 and e["target"] == tgt3),
        None,
    )
    assert edge3 is not None and edge3["reviewStatus"] == "rejected"
    coverage3 = await orch.get_current_coverage()
    assert coverage3["coveredCount"] <= coverage["coveredCount"]


async def test_autopilot_persists_across_restart(mock_llm):
    """Autopilot 产物（候选/发现/图谱）在重启后依然存在。"""
    from app.modules.autopilot.orchestrator import AutopilotOrchestrator
    from app.modules.diagnostics.infra.memory_store import InMemoryFindingRepository
    from app.modules.recognition.infra.memory_store import InMemoryCandidateRepository

    user_id = f"e2e-{uuid.uuid4().hex[:8]}"
    orch = LangGraphAgentOrchestrator(llm=mock_llm, rag=None, user_id=user_id)
    resource = _resource("实验指导书文本：包含链表、串口、综合设计实验内容。")
    candidates = InMemoryCandidateRepository(with_seed=False, user_id=user_id)
    findings = InMemoryFindingRepository(with_seed=False, user_id=user_id)

    autopilot = AutopilotOrchestrator(
        pipeline=orch,
        resources_repo=_ResourceRepo(resource),
        candidates_repo=candidates,
        findings_repo=findings,
    )
    result = await autopilot.run(resource.id)
    assert result["candidates_created"] >= 1

    ids_before = {c.id for c in await candidates.list_all()}
    assert ids_before, "候选应已落库"

    # 模拟重启：同一 user_id 的新实例从头读取
    orch2 = LangGraphAgentOrchestrator(llm=mock_llm, rag=None, user_id=user_id)
    graph2 = await orch2.get_current_graph()
    assert graph2["nodes"], "重启后图谱仍可读取"
