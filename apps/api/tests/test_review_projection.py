"""识别中心审核决策 → 能力图谱投影 的领域测试。

验证「图谱是审核决策的投影」这一设计：采纳/驳回关系候选会真实改变
图谱边与覆盖度结果；待审与不可解析的候选不改变图谱。
"""

from dataclasses import replace

from app.modules.orchestration.domain.coverage import analyze_coverage
from app.modules.orchestration.domain.models import (
    AbilityGraph,
    GraphEdge,
    GraphNode,
)
from app.modules.orchestration.domain.projection import (
    apply_review_decisions,
    strength_from_confidence,
)
from app.modules.orchestration.infra.seed_graph import build_seed_graph
from app.modules.orchestration.infra.tools import graph_to_state
from app.modules.recognition.domain.candidate import (
    CandidateReviewStatus,
    RecognitionCandidate,
    RecognitionCandidateRisk,
    RecognitionCandidateType,
)


def _graph_dicts() -> tuple[list[dict], list[dict]]:
    return graph_to_state(build_seed_graph())


def _make_candidate(**overrides) -> RecognitionCandidate:
    base = dict(
        id="candidate-test",
        title="「链表实现」实验支撑能力指标「1-1 工程知识应用」",
        course="数据结构",
        candidate_type=RecognitionCandidateType.RELATION,
        confidence=90,
        risk=RecognitionCandidateRisk.HIGH_IMPACT,
        source_node="链表实现",
        relation="支撑",
        target_node="1-1 工程知识应用",
        explanation="测试候选",
        processor_version="test",
        generated_at="2026-08-01 10:00",
    )
    base.update(overrides)
    return RecognitionCandidate(**base)


def _coverage_of(merged: dict) -> dict:
    graph = AbilityGraph(
        nodes=[GraphNode.from_dict(n) for n in merged["nodes"]],
        edges=[GraphEdge.from_dict(e) for e in merged["edges"]],
    )
    report = analyze_coverage(graph)
    return {c.code: c for c in report.competencies}


def test_strength_from_confidence_thresholds() -> None:
    assert strength_from_confidence(90) == "strong"
    assert strength_from_confidence(85) == "strong"
    assert strength_from_confidence(84) == "medium"
    assert strength_from_confidence(70) == "medium"
    assert strength_from_confidence(69) == "weak"


def test_pending_candidate_does_not_change_graph() -> None:
    nodes, edges = _graph_dicts()
    merged = apply_review_decisions(nodes, edges, [_make_candidate()])
    assert merged["edges"] == edges


def _add_source_node(nodes: list[dict], node_id: str, name: str) -> None:
    nodes.append({
        "id": node_id,
        "code": node_id,
        "name": name,
        "kind": "experiment",
    })


def test_accepted_candidate_projects_approved_edge_and_covers() -> None:
    nodes, edges = _graph_dicts()
    _add_source_node(nodes, "exp-list", "链表实现")
    accepted = _make_candidate(review_status=CandidateReviewStatus.ACCEPTED)
    merged = apply_review_decisions(nodes, edges, [accepted])

    new_edges = [
        e
        for e in merged["edges"]
        if e["source"] == "exp-list" and e["target"] == "std-c-01-01"
    ]
    assert len(new_edges) == 1
    assert new_edges[0]["reviewStatus"] == "approved"
    assert new_edges[0]["strength"] == "strong"
    assert new_edges[0]["sourceType"] == "manual"

    comps = _coverage_of(merged)
    assert comps["C-01-01"].status == "covered"
    assert comps["C-01-01"].attainment == 1.0
    # 其他指标点不受影响
    assert comps["C-03-01"].status == "gap"


def test_accepted_candidate_updates_duplicate_pending_edges() -> None:
    nodes, edges = _graph_dicts()
    _add_source_node(nodes, "exp-list", "链表实现")
    edges.extend(
        [
            {
                "id": "ai-rel-old-exp-list-std-c-01-01",
                "source": "exp-list",
                "target": "std-c-01-01",
                "kind": "SUPPORTS",
                "sourceType": "ai",
                "reviewStatus": "pending",
                "strength": "weak",
                "confidence": 0.62,
                "reasoning": "older duplicate",
            },
            {
                "id": "ai-rel-new-exp-list-std-c-01-01",
                "source": "exp-list",
                "target": "std-c-01-01",
                "kind": "SUPPORTS",
                "sourceType": "ai",
                "reviewStatus": "pending",
                "strength": "medium",
                "confidence": 0.78,
                "reasoning": "newer duplicate",
            },
        ]
    )
    accepted = _make_candidate(review_status=CandidateReviewStatus.ACCEPTED)

    merged = apply_review_decisions(nodes, edges, [accepted])

    matching = [
        e
        for e in merged["edges"]
        if e["source"] == "exp-list" and e["target"] == "std-c-01-01"
    ]
    assert len(matching) == 2
    assert {e["reviewStatus"] for e in matching} == {"approved"}


def test_rejected_candidate_demotes_existing_edge() -> None:
    nodes, edges = _graph_dicts()
    _add_source_node(nodes, "exp-list", "链表实现")
    accepted = _make_candidate(review_status=CandidateReviewStatus.ACCEPTED)

    later_reject = replace(
        accepted,
        id="candidate-test-r2",
        review_status=CandidateReviewStatus.REJECTED,
        generated_at="2026-08-02 09:00",
    )
    merged2 = apply_review_decisions(nodes, edges, [accepted, later_reject])

    edge = next(
        e
        for e in merged2["edges"]
        if e["source"] == "exp-list" and e["target"] == "std-c-01-01"
    )
    assert edge["reviewStatus"] == "rejected"
    comps = _coverage_of(merged2)
    assert comps["C-01-01"].status == "gap"


def test_low_confidence_acceptance_is_partial() -> None:
    nodes, edges = _graph_dicts()
    _add_source_node(nodes, "exp-sort", "排序对比")
    weak = _make_candidate(
        id="candidate-weak",
        source_node="排序对比",
        target_node="1-1 工程知识应用",
        confidence=66,
        review_status=CandidateReviewStatus.ACCEPTED,
    )
    merged = apply_review_decisions(nodes, edges, [weak])
    comps = _coverage_of(merged)
    assert comps["C-01-01"].status == "partial"
    assert comps["C-01-01"].attainment < 1.0


def test_unresolvable_candidate_is_not_projected() -> None:
    nodes, edges = _graph_dicts()
    ghost = _make_candidate(
        id="candidate-ghost",
        source_node="不存在的实验",
        target_node="不存在的能力指标",
        review_status=CandidateReviewStatus.ACCEPTED,
    )
    merged = apply_review_decisions(nodes, edges, [ghost])
    assert merged["edges"] == edges


def test_input_lists_are_not_mutated() -> None:
    nodes, edges = _graph_dicts()
    edges_before = [dict(e) for e in edges]
    accepted = _make_candidate(review_status=CandidateReviewStatus.ACCEPTED)
    apply_review_decisions(nodes, edges, [accepted])
    assert edges == edges_before
