import asyncio

from app.modules.diagnostics.application.list_findings import ListFindings
from app.modules.diagnostics.domain.finding import (
    DiagnosticFinding,
    DiagnosticFindingRisk,
    DiagnosticFindingType,
)
from app.modules.diagnostics.infra.memory_store import InMemoryFindingRepository
from app.modules.orchestration.application.graph_query import QueryProjectedGraph
from app.modules.recognition.infra.memory_store import InMemoryCandidateRepository
from app.modules.resources.domain.resource import (
    TeachingResource,
    TeachingResourceSensitivity,
    TeachingResourceStatus,
    TeachingResourceType,
)
from app.modules.resources.infra.memory_store import InMemoryResourceRepository


class _StaleGraphOrchestrator:
    async def get_current_graph(self):
        return {
            "nodes": [
                {
                    "id": "std-c-01-01",
                    "kind": "Competency",
                    "code": "C-01-01",
                    "name": "工程知识应用",
                    "origin": "standard",
                },
                {
                    "id": "ext-exp-old",
                    "kind": "Experiment",
                    "code": "EXP-OLD",
                    "name": "历史残留实验",
                    "origin": "school",
                },
            ],
            "edges": [
                {
                    "id": "edge-old",
                    "source": "ext-exp-old",
                    "target": "std-c-01-01",
                    "kind": "SUPPORTS",
                    "sourceType": "ai",
                    "reviewStatus": "approved",
                    "strength": "strong",
                }
            ],
        }

    async def get_current_coverage(self):
        return {}


class _LegacyPendingGraphOrchestrator:
    async def get_current_graph(self):
        return {
            "nodes": [
                {
                    "id": "std-c-04-02",
                    "kind": "Competency",
                    "code": "C-04-02",
                    "name": "数据分析与解释",
                    "origin": "standard",
                },
                {
                    "id": "ext-exp-legacy",
                    "kind": "Experiment",
                    "code": "EXP-LEGACY",
                    "name": "AI 抽取出的实验",
                    "origin": "school",
                    "properties": {},
                },
            ],
            "edges": [
                {
                    "id": "edge-legacy-pending",
                    "source": "ext-exp-legacy",
                    "target": "std-c-04-02",
                    "kind": "SUPPORTS",
                    "sourceType": "ai",
                    "reviewStatus": "pending",
                    "strength": "strong",
                    "materialResourceId": "resource-legacy",
                    "materialName": "综合实验报告",
                }
            ],
        }

    async def get_current_coverage(self):
        return {}


def _finding() -> DiagnosticFinding:
    return DiagnosticFinding(
        id="finding-stale",
        title="历史残留诊断",
        course="单片机基础",
        type=DiagnosticFindingType.COVERAGE_GAP,
        risk=DiagnosticFindingRisk.HIGH,
        source_node="ext-exp-old",
        target_node="std-c-01-01",
        relation_label="支撑",
        graph_version="v-old",
        rule_id="r1",
        rule_version="rules-v1",
        rule_kind="coverage-gap",
        rule_basis="basis",
        rule_rationale="rationale",
        rule_run_at="2026-08-13 10:00",
        major_id="major-eie",
    )


def _resource() -> TeachingResource:
    return TeachingResource(
        id="resource-legacy",
        name="综合实验报告",
        file_name="综合实验报告.pdf",
        course="电子信息综合实验",
        resource_type=TeachingResourceType.LAB_GUIDE,
        version="v1",
        format="PDF",
        status=TeachingResourceStatus.READY,
        size="10 KB",
        sensitivity=TeachingResourceSensitivity.INTERNAL,
        updated_at="2026-08-13 10:00",
        owner="tester",
        hash="SHA256 test",
        next_action="ready",
        source_coverage=100,
        major_id="major-eie",
    )


def test_graph_query_returns_empty_when_material_scope_is_empty() -> None:
    resources = InMemoryResourceRepository(with_seed=False, user_id="empty-graph")
    candidates = InMemoryCandidateRepository(with_seed=False, user_id="empty-graph")
    query = QueryProjectedGraph(
        orchestrator=_StaleGraphOrchestrator(),
        candidates=candidates,
        resources=resources,
        major_id="major-eie",
    )

    graph = asyncio.run(query.current_graph())
    coverage = asyncio.run(query.current_coverage())

    assert graph == {"nodes": [], "edges": []}
    assert coverage["requirements"] == []
    assert coverage["competencies"] == []
    assert coverage["overallCoverageRate"] == 0


def test_graph_query_backfills_course_scope_from_material_repository() -> None:
    resources = InMemoryResourceRepository(
        with_seed=False,
        user_id="legacy-course-scope",
    )
    resources._store = {"resource-legacy": _resource()}
    candidates = InMemoryCandidateRepository(
        with_seed=False,
        user_id="legacy-course-scope",
    )
    query = QueryProjectedGraph(
        orchestrator=_LegacyPendingGraphOrchestrator(),
        candidates=candidates,
        resources=resources,
        major_id="major-eie",
    )

    graph = asyncio.run(query.current_graph())

    course_nodes = [node for node in graph["nodes"] if node.get("kind") == "Course"]
    assert [node.get("name") for node in course_nodes] == ["电子信息综合实验"]
    assert any(
        edge.get("kind") == "BELONGS_TO"
        and edge.get("source") == "ext-exp-legacy"
        and edge.get("target") == course_nodes[0]["id"]
        for edge in graph["edges"]
    )


def test_findings_are_hidden_when_material_scope_is_empty() -> None:
    resources = InMemoryResourceRepository(with_seed=False, user_id="empty-findings")
    findings = InMemoryFindingRepository(with_seed=False, user_id="empty-findings")
    findings._store = {"finding-stale": _finding()}

    result = asyncio.run(
        ListFindings(
            repository=findings,
            active_major_id="major-eie",
            resources=resources,
        ).execute()
    )

    assert result == []
