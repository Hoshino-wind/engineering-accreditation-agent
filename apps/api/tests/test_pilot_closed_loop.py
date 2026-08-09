"""De-identified single-major pilot closed-loop acceptance scenario."""

import asyncio

from app.modules.diagnostics.domain.finding import (
    DiagnosticFinding,
    DiagnosticFindingRisk,
    DiagnosticFindingType,
    FindingDecisionStatus,
)
from app.modules.improvements.domain.improvement import (
    Improvement,
    ImprovementPriority,
    ImprovementStatus,
)
from app.modules.orchestration.domain.coverage import analyze_coverage
from app.modules.orchestration.domain.models import AbilityGraph, GraphEdge, GraphNode
from app.modules.orchestration.domain.projection import apply_review_decisions
from app.modules.orchestration.infra.seed_graph import build_seed_graph
from app.modules.orchestration.infra.tools import graph_to_state
from app.modules.recognition.domain.candidate import (
    CandidateReviewStatus,
    RecognitionCandidate,
    RecognitionCandidateRisk,
    RecognitionCandidateType,
)
from app.modules.resources.application.upload_resource import UploadResource
from app.modules.resources.domain.resource import TeachingResource
from app.modules.support.application import GetSupportReadiness


class ResourceRepository:
    async def add(self, resource: TeachingResource) -> TeachingResource:
        return resource


class ListRepository:
    def __init__(self, items: list[object]) -> None:
        self._items = items

    async def list_all(self, **_kwargs):
        return self._items


def test_electronic_information_engineering_pilot_closed_loop() -> None:
    resource = asyncio.run(
        UploadResource(ResourceRepository()).execute(
            file_name="data-structures-lab-guide.pdf",
            file_size_bytes=12,
            content_hash="pilot-material-sha256",
        )
    )
    candidate = RecognitionCandidate(
        id="pilot-candidate-1",
        title="Linked-list lab supports engineering knowledge",
        course="Data Structures",
        candidate_type=RecognitionCandidateType.RELATION,
        confidence=90,
        risk=RecognitionCandidateRisk.NORMAL,
        source_node="pilot-lab-linked-list",
        relation="supports",
        target_node="std-c-01-01",
        explanation="De-identified pilot relation.",
        processor_version="pilot-v1",
        generated_at="2026-08-09T00:00:00Z",
        review_status=CandidateReviewStatus.ACCEPTED,
    )

    nodes, edges = graph_to_state(build_seed_graph())
    nodes.append(
        GraphNode(
            id="pilot-lab-linked-list",
            code="LAB-DS-01",
            name="Linked-list lab",
            kind="experiment",
        ).to_dict()
    )
    projected = apply_review_decisions(nodes, edges, [candidate])
    graph = AbilityGraph(
        nodes=[GraphNode.from_dict(node) for node in projected["nodes"]],
        edges=[GraphEdge.from_dict(edge) for edge in projected["edges"]],
    )
    coverage = analyze_coverage(graph)
    competency = next(item for item in coverage.competencies if item.code == "C-01-01")
    assert competency.status == "covered"

    finding = DiagnosticFinding(
        id="pilot-finding-1",
        title="Pilot finding",
        course="Data Structures",
        type=DiagnosticFindingType.COVERAGE_GAP,
        risk=DiagnosticFindingRisk.LOW,
        source_node="std-c-03-01",
        target_node="pending material",
        relation_label="supports",
        graph_version="pilot-v1",
        rule_id="PILOT-001",
        rule_version="v1",
        rule_kind="deterministic",
        rule_basis="Pilot acceptance scenario",
        rule_rationale="A second lab guide is required.",
        rule_run_at="2026-08-09T00:00:00Z",
        decision_status=FindingDecisionStatus.CONFIRMED,
    )
    improvement = Improvement(
        id="pilot-improvement-1",
        title="Add a design lab guide",
        description="De-identified pilot improvement.",
        course="Data Structures",
        finding_id=finding.id,
        target_code="C-03-01",
        target_name="System design methods",
        root_cause="Insufficient material coverage",
        action="Publish a second lab guide",
        expected_effect="Improved evidence coverage",
        owner="pilot-teacher",
        deadline=None,
        status=ImprovementStatus.CLOSED,
        priority=ImprovementPriority.MEDIUM,
        created_at="2026-08-09T00:00:00Z",
        updated_at="2026-08-09T00:00:00Z",
    )

    readiness = asyncio.run(
        GetSupportReadiness(
            resources=ListRepository([resource]),
            candidates=ListRepository([candidate]),
            findings=ListRepository([finding]),
            improvements=ListRepository([improvement]),
            major_id="major-eie",
        ).execute(course="Data Structures")
    )

    assert readiness.ready is True
    assert readiness.evidence_count == 1
    assert readiness.pending_review_count == 0
    assert readiness.pending_finding_count == 0
    assert readiness.open_improvement_count == 0
