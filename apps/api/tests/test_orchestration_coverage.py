"""覆盖度纯逻辑单测：验证 approved-only 计数、strength 权重、阈值判定。"""

from app.modules.orchestration.domain.coverage import analyze_coverage
from app.modules.orchestration.domain.models import (
    AbilityGraph,
    GraphEdge,
    GraphNode,
)


def _node(id: str, code: str, name: str, kind: str, origin: str = "school") -> GraphNode:
    return GraphNode(id=id, code=code, name=name, kind=kind, origin=origin)


def _edge(
    id: str,
    source: str,
    target: str,
    kind: str = "SUPPORTS",
    strength: str = "medium",
    review_status: str = "approved",
) -> GraphEdge:
    return GraphEdge(
        id=id,
        source=source,
        target=target,
        kind=kind,
        strength=strength,
        review_status=review_status,
    )


def _base_graph() -> AbilityGraph:
    """构建一个最小测试图谱：1 个毕业要求 + 2 个指标点 + 2 门课程。"""
    nodes = [
        _node("gr-01", "GR-01", "工程知识", "GraduationRequirement", origin="standard"),
        _node("c-01", "C-01-01", "数学应用", "Competency", origin="standard"),
        _node("c-02", "C-01-02", "物理应用", "Competency", origin="standard"),
        _node("co-01", "CO-01", "高等数学", "Course", origin="school"),
        _node("co-02", "CO-02", "大学物理", "Course", origin="school"),
    ]
    edges = [
        _edge("e-contains-1", "gr-01", "c-01", kind="CONTAINS"),
        _edge("e-contains-2", "gr-01", "c-02", kind="CONTAINS"),
    ]
    return AbilityGraph(nodes=nodes, edges=edges)


class TestApprovedOnlyCounting:
    """只有 approved 边才计入覆盖度。"""

    def test_pending_edges_not_counted(self):
        graph = _base_graph()
        # 添加 pending 边 — 不应计入强度，但标记为 partial（有待审核）
        edges = list(graph.edges) + [
            _edge("e-sup-1", "co-01", "c-01", strength="strong", review_status="pending"),
        ]
        report = analyze_coverage(AbilityGraph(nodes=graph.nodes, edges=edges))
        comp = next(c for c in report.competencies if c.code == "C-01-01")
        assert comp.status == "partial"  # 有待审核 → 非 gap
        assert comp.total_strength == 0  # pending 不计入强度
        assert comp.has_pending_review is True

    def test_rejected_edges_not_counted(self):
        graph = _base_graph()
        edges = list(graph.edges) + [
            _edge("e-sup-1", "co-01", "c-01", strength="strong", review_status="rejected"),
        ]
        report = analyze_coverage(AbilityGraph(nodes=graph.nodes, edges=edges))
        comp = next(c for c in report.competencies if c.code == "C-01-01")
        assert comp.status == "gap"

    def test_approved_edges_counted(self):
        graph = _base_graph()
        edges = list(graph.edges) + [
            _edge("e-sup-1", "co-01", "c-01", strength="strong", review_status="approved"),
        ]
        report = analyze_coverage(AbilityGraph(nodes=graph.nodes, edges=edges))
        comp = next(c for c in report.competencies if c.code == "C-01-01")
        assert comp.status == "covered"
        assert comp.total_strength == 3


class TestStrengthWeights:
    """strong=3, medium=2, weak=1 权重。"""

    def test_strong_gives_3(self):
        graph = _base_graph()
        edges = list(graph.edges) + [
            _edge("e-1", "co-01", "c-01", strength="strong"),
        ]
        report = analyze_coverage(AbilityGraph(nodes=graph.nodes, edges=edges))
        comp = next(c for c in report.competencies if c.code == "C-01-01")
        assert comp.total_strength == 3
        assert comp.attainment == 1.0

    def test_medium_gives_2(self):
        graph = _base_graph()
        edges = list(graph.edges) + [
            _edge("e-1", "co-01", "c-01", strength="medium"),
        ]
        report = analyze_coverage(AbilityGraph(nodes=graph.nodes, edges=edges))
        comp = next(c for c in report.competencies if c.code == "C-01-01")
        assert comp.total_strength == 2
        assert comp.status == "partial"

    def test_weak_gives_1(self):
        graph = _base_graph()
        edges = list(graph.edges) + [
            _edge("e-1", "co-01", "c-01", strength="weak"),
        ]
        report = analyze_coverage(AbilityGraph(nodes=graph.nodes, edges=edges))
        comp = next(c for c in report.competencies if c.code == "C-01-01")
        assert comp.total_strength == 1
        assert comp.status == "partial"

    def test_accumulation(self):
        graph = _base_graph()
        edges = list(graph.edges) + [
            _edge("e-1", "co-01", "c-01", strength="medium"),
            _edge("e-2", "co-02", "c-01", strength="weak"),
        ]
        report = analyze_coverage(AbilityGraph(nodes=graph.nodes, edges=edges))
        comp = next(c for c in report.competencies if c.code == "C-01-01")
        assert comp.total_strength == 3  # 2+1
        assert comp.status == "covered"


class TestThresholds:
    """覆盖率阈值：>=0.8 covered, >0 partial, 0 gap。"""

    def test_requirement_covered_when_all_comps_covered(self):
        graph = _base_graph()
        edges = list(graph.edges) + [
            _edge("e-1", "co-01", "c-01", strength="strong"),
            _edge("e-2", "co-02", "c-02", strength="strong"),
        ]
        report = analyze_coverage(AbilityGraph(nodes=graph.nodes, edges=edges))
        req = next(r for r in report.requirements if r.code == "GR-01")
        assert req.coverage_rate == 1.0
        assert req.status == "covered"

    def test_requirement_partial_when_some_covered(self):
        graph = _base_graph()
        edges = list(graph.edges) + [
            _edge("e-1", "co-01", "c-01", strength="strong"),
            # c-02 无支撑
        ]
        report = analyze_coverage(AbilityGraph(nodes=graph.nodes, edges=edges))
        req = next(r for r in report.requirements if r.code == "GR-01")
        assert req.coverage_rate == 0.5
        assert req.status == "partial"

    def test_requirement_gap_when_nothing_covered(self):
        graph = _base_graph()
        report = analyze_coverage(graph)
        req = next(r for r in report.requirements if r.code == "GR-01")
        assert req.coverage_rate == 0.0
        assert req.status == "gap"

    def test_overall_rate(self):
        graph = _base_graph()
        edges = list(graph.edges) + [
            _edge("e-1", "co-01", "c-01", strength="strong"),
        ]
        report = analyze_coverage(AbilityGraph(nodes=graph.nodes, edges=edges))
        # 2 competencies, 1 covered → 0.5
        assert report.overall_coverage_rate == 0.5
        assert report.covered_count == 1
        assert report.gap_count == 1
