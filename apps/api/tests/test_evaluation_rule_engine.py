from app.modules.evaluations.rule_engine import EvaluationRuleSet, evaluate
from app.modules.orchestration.domain.models import AbilityGraph, GraphEdge, GraphNode


def test_evaluation_run_freezes_rules_and_input_snapshot() -> None:
    graph = AbilityGraph(
        nodes=[
            GraphNode(
                id="comp-1",
                code="C-01-01",
                name="Engineering knowledge",
                kind="Competency",
                origin="standard",
            ),
            GraphNode(
                id="course-1",
                code="COURSE-01",
                name="Data Structures",
                kind="Course",
            ),
        ],
        edges=[
            GraphEdge(
                id="edge-1",
                source="course-1",
                target="comp-1",
                kind="SUPPORTS",
                review_status="approved",
                strength="strong",
            ),
        ],
    )

    run = evaluate(graph, graph_version="graph-v1", rules=EvaluationRuleSet(version="rules-v1"))

    assert run.rule_version == "rules-v1"
    assert run.graph_version == "graph-v1"
    assert len(run.input_snapshot_hash) == 64
    assert len(run.items) == 1
    assert run.items[0].competency_code == "C-01-01"
    assert run.items[0].attainment == 0.75
    assert run.items[0].status == "partial"


def test_rule_version_changes_evaluation_snapshot() -> None:
    graph = AbilityGraph()

    first = evaluate(graph, graph_version="graph-v1", rules=EvaluationRuleSet(version="rules-v1"))
    second = evaluate(graph, graph_version="graph-v1", rules=EvaluationRuleSet(version="rules-v2"))

    assert first.input_snapshot_hash != second.input_snapshot_hash
