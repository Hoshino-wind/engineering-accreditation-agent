from pydantic import BaseModel, ConfigDict

from app.modules.diagnostics.domain.finding import (
    DiagnosticEvidenceRef,
    DiagnosticFinding,
    DiagnosticFindingRisk,
    DiagnosticFindingType,
    FindingDecisionStatus,
    GraphDiagnosticReport,
)


class DiagnosticEvidenceRefResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    id: str
    objectName: str
    objectVersion: str
    coordinate: str
    excerpt: str
    hash: str


class DiagnosticFindingResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    id: str
    title: str
    course: str
    type: DiagnosticFindingType
    risk: DiagnosticFindingRisk
    sourceNode: str
    targetNode: str
    relationLabel: str
    graphVersion: str
    rule: dict[str, str]
    decisionStatus: FindingDecisionStatus
    impact: dict[str, int]
    suggestedDestination: str
    evidence: list[DiagnosticEvidenceRefResponse]

    @classmethod
    def from_domain(cls, f: DiagnosticFinding) -> "DiagnosticFindingResponse":
        return cls(
            id=f.id,
            title=f.title,
            course=f.course,
            type=f.type,
            risk=f.risk,
            sourceNode=f.source_node,
            targetNode=f.target_node,
            relationLabel=f.relation_label,
            graphVersion=f.graph_version,
            rule={
                "id": f.rule_id,
                "version": f.rule_version,
                "kind": f.rule_kind,
                "basis": f.rule_basis,
                "rationale": f.rule_rationale,
                "runAt": f.rule_run_at,
            },
            decisionStatus=f.decision_status,
            impact={
                "courseObjectives": f.impact_course_objectives,
                "abilityNodes": f.impact_ability_nodes,
                "evaluationInputs": f.impact_evaluation_inputs,
            },
            suggestedDestination=f.suggested_destination,
            evidence=[
                DiagnosticEvidenceRefResponse(
                    id=e.id,
                    objectName=e.object_name,
                    objectVersion=e.object_version,
                    coordinate=e.coordinate,
                    excerpt=e.excerpt,
                    hash=e.hash,
                )
                for e in f.evidence
            ],
        )


class FindingDecisionRequest(BaseModel):
    decision: str  # confirm | dismiss | convert


class GraphDiagnosticReportResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    graphVersion: str
    generatedAt: str
    overallCoverageRate: float
    gapCount: int
    partialCount: int
    orphanNodeCount: int
    diagnosticsMode: str
    findings: list[DiagnosticFindingResponse]

    @classmethod
    def from_domain(cls, report: GraphDiagnosticReport) -> "GraphDiagnosticReportResponse":
        return cls(
            graphVersion=report.graph_version,
            generatedAt=report.generated_at,
            overallCoverageRate=report.overall_coverage_rate,
            gapCount=report.gap_count,
            partialCount=report.partial_count,
            orphanNodeCount=report.orphan_node_count,
            diagnosticsMode=report.diagnostics_mode,
            findings=[
                DiagnosticFindingResponse.from_domain(finding)
                for finding in report.findings
            ],
        )
