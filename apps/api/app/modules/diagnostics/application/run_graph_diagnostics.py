from __future__ import annotations

import logging
from dataclasses import dataclass, replace
from datetime import UTC, datetime

from app.modules.diagnostics.application.ports import FindingRepository
from app.modules.diagnostics.domain.finding import (
    DiagnosticEvidenceRef,
    DiagnosticFinding,
    DiagnosticFindingRisk,
    DiagnosticFindingType,
    FindingDecisionStatus,
    GraphDiagnosticReport,
)
from app.modules.graph.application.ports import AbilityGraphRepository
from app.modules.graph.domain import AbilityGraph, AbilityGraphEdge, AbilityGraphNode
from app.modules.llm.application.ports import LLMClientPort

logger = logging.getLogger(__name__)

APPROVED_GRAPH_STATUSES = {"approved", "modified"}
STRENGTH_WEIGHT = {"strong": 3, "medium": 2, "weak": 1}
GRAPH_RULE_VERSION = "v0.6"


@dataclass(frozen=True, slots=True)
class CompetencyCoverage:
    competency: AbilityGraphNode
    supporters: tuple[AbilityGraphNode, ...]
    approved_edges: tuple[AbilityGraphEdge, ...]
    pending_edges: tuple[AbilityGraphEdge, ...]
    status: str
    strength_score: int


@dataclass(frozen=True, slots=True)
class CoverageAnalysis:
    competencies: tuple[CompetencyCoverage, ...]
    orphan_nodes: tuple[AbilityGraphNode, ...]
    overall_coverage_rate: float
    gap_count: int
    partial_count: int


class RunGraphDiagnostics:
    def __init__(
        self,
        *,
        graph_repository: AbilityGraphRepository,
        finding_repository: FindingRepository,
        llm: LLMClientPort | None = None,
    ) -> None:
        self._graph_repository = graph_repository
        self._finding_repository = finding_repository
        self._llm = llm

    async def execute(self) -> GraphDiagnosticReport:
        graph = await self._graph_repository.get_graph()
        generated_at = datetime.now(UTC).isoformat()
        graph_version = f"graph-{generated_at[:10]}"
        analysis = _analyze_graph(graph)
        findings = _build_findings(
            graph=graph,
            analysis=analysis,
            graph_version=graph_version,
            generated_at=generated_at,
        )
        diagnostics_mode = "rules"

        if findings and self._llm is not None:
            findings, used_llm = await self._enrich_findings_with_llm(findings)
            diagnostics_mode = "rules+llm" if used_llm else "rules"

        persisted = await self._finding_repository.replace_graph_findings(findings)
        return GraphDiagnosticReport(
            graph_version=graph_version,
            generated_at=generated_at,
            overall_coverage_rate=analysis.overall_coverage_rate,
            gap_count=analysis.gap_count,
            partial_count=analysis.partial_count,
            orphan_node_count=len(analysis.orphan_nodes),
            diagnostics_mode=diagnostics_mode,
            findings=tuple(persisted),
        )

    async def _enrich_findings_with_llm(
        self,
        findings: list[DiagnosticFinding],
    ) -> tuple[list[DiagnosticFinding], bool]:
        if self._llm is None:
            return findings, False

        facts = [
            {
                "code": _target_code(finding.target_node),
                "name": finding.target_node,
                "risk": finding.risk.value,
                "type": finding.type.value,
                "rule_based_explanation": finding.rule_rationale,
                "evidence_refs": [item.object_name for item in finding.evidence],
            }
            for finding in findings
            if finding.decision_status == FindingDecisionStatus.PENDING
        ]
        if not facts:
            return findings, False

        try:
            explanations = await self._llm.generate_explanation(facts)
            suggestions = await self._llm.generate_suggestions(facts)
        except Exception:
            logger.exception("LLM graph diagnostics enrichment failed")
            return findings, False

        explanation_by_code = {item.target_code: item for item in explanations.data}
        suggestion_by_code = {item.target_code: item for item in suggestions.data}
        enriched: list[DiagnosticFinding] = []
        for finding in findings:
            code = _target_code(finding.target_node)
            explanation = explanation_by_code.get(code)
            suggestion = suggestion_by_code.get(code)
            if explanation is None and suggestion is None:
                enriched.append(finding)
                continue

            rationale_parts = []
            if explanation:
                rationale_parts.append(explanation.narrative)
            if suggestion:
                rationale_parts.append(
                    f"根因：{suggestion.root_cause}；建议：{suggestion.suggestion}；预期效果：{suggestion.expected_effect}"
                )
            enriched.append(
                replace(
                    finding,
                    rule_kind="rules+llm",
                    rule_rationale="\n".join(rationale_parts) or finding.rule_rationale,
                )
            )

        return enriched, True


def _analyze_graph(graph: AbilityGraph) -> CoverageAnalysis:
    standard_competencies = [
        node
        for node in graph.nodes
        if node.kind == "Competency" and node.origin == "standard"
    ]
    school_nodes = [node for node in graph.nodes if node.origin == "school"]
    nodes_by_id = {node.id: node for node in graph.nodes}

    incoming_by_target: dict[str, list[AbilityGraphEdge]] = {}
    connected_node_ids: set[str] = set()
    for edge in graph.edges:
        incoming_by_target.setdefault(edge.target, []).append(edge)
        connected_node_ids.add(edge.source)
        connected_node_ids.add(edge.target)

    coverages: list[CompetencyCoverage] = []
    for competency in standard_competencies:
        incoming_edges = [
            edge
            for edge in incoming_by_target.get(competency.id, [])
            if edge.kind == "SUPPORTS"
        ]
        approved_edges = [
            edge for edge in incoming_edges if edge.review_status in APPROVED_GRAPH_STATUSES
        ]
        pending_edges = [
            edge for edge in incoming_edges if edge.review_status == "pending"
        ]
        supporter_ids = {edge.source for edge in approved_edges}
        supporters = tuple(
            node
            for node in school_nodes
            if node.id in supporter_ids or node.id in nodes_by_id and node.id in supporter_ids
        )
        strength_score = sum(
            STRENGTH_WEIGHT.get(edge.strength or "weak", 1)
            for edge in approved_edges
        )

        if not supporters and not pending_edges:
            status = "gap"
        elif not supporters and pending_edges:
            status = "pending"
        elif strength_score >= STRENGTH_WEIGHT["strong"]:
            status = "covered"
        else:
            status = "partial"

        coverages.append(
            CompetencyCoverage(
                competency=competency,
                supporters=supporters,
                approved_edges=tuple(approved_edges),
                pending_edges=tuple(pending_edges),
                status=status,
                strength_score=strength_score,
            )
        )

    orphan_nodes = tuple(
        node
        for node in school_nodes
        if node.id not in connected_node_ids
    )
    covered_count = sum(1 for item in coverages if item.status == "covered")
    overall_coverage_rate = (
        covered_count / len(standard_competencies)
        if standard_competencies
        else 0.0
    )

    return CoverageAnalysis(
        competencies=tuple(coverages),
        orphan_nodes=orphan_nodes,
        overall_coverage_rate=overall_coverage_rate,
        gap_count=sum(1 for item in coverages if item.status == "gap"),
        partial_count=sum(1 for item in coverages if item.status in {"partial", "pending"}),
    )


def _build_findings(
    *,
    graph: AbilityGraph,
    analysis: CoverageAnalysis,
    graph_version: str,
    generated_at: str,
) -> list[DiagnosticFinding]:
    findings: list[DiagnosticFinding] = []
    for coverage in analysis.competencies:
        if coverage.status == "covered":
            continue
        if coverage.status == "gap":
            findings.append(
                _coverage_gap_finding(coverage, graph_version, generated_at)
            )
        elif coverage.status == "pending":
            findings.append(
                _pending_review_finding(coverage, graph_version, generated_at)
            )
        else:
            findings.append(
                _weak_support_finding(coverage, graph_version, generated_at)
            )

    for orphan in analysis.orphan_nodes:
        findings.append(_orphan_finding(orphan, graph_version, generated_at))

    return findings


def _coverage_gap_finding(
    coverage: CompetencyCoverage,
    graph_version: str,
    generated_at: str,
) -> DiagnosticFinding:
    node_label = _node_label(coverage.competency)
    return DiagnosticFinding(
        id=f"finding-graph-gap-{coverage.competency.id}",
        title=f"{coverage.competency.code} 缺少正式支撑材料",
        course="全专业",
        type=DiagnosticFindingType.COVERAGE_GAP,
        risk=DiagnosticFindingRisk.HIGH,
        source_node="未找到已审核支撑源",
        target_node=node_label,
        relation_label="SUPPORTS",
        graph_version=graph_version,
        rule_id="GRAPH-DIAG-COVERAGE-GAP",
        rule_version=GRAPH_RULE_VERSION,
        rule_kind="rules",
        rule_basis="每个毕业要求指标点至少需要一个经教师审核确认的课程、实验或教学资源支撑。",
        rule_rationale=(
            f"{node_label} 当前没有审核通过的 SUPPORTS 关系。"
            "这会导致后续达成度评价缺少证据来源，认证支撑报告也无法形成完整证据链。"
            "建议先到 M3 补充课程大纲、实验指导书或评价材料，再到 M4 完成关系审核。"
        ),
        rule_run_at=generated_at,
        decision_status=FindingDecisionStatus.PENDING,
        impact_course_objectives=1,
        impact_ability_nodes=1,
        impact_evaluation_inputs=1,
        suggested_destination="M3",
        evidence=(
            DiagnosticEvidenceRef(
                id=f"evidence-{coverage.competency.id}",
                object_name="正式能力图谱",
                object_version=graph_version,
                coordinate=coverage.competency.code,
                excerpt=coverage.competency.description or node_label,
                hash=f"graph:{coverage.competency.id}",
            ),
        ),
    )


def _pending_review_finding(
    coverage: CompetencyCoverage,
    graph_version: str,
    generated_at: str,
) -> DiagnosticFinding:
    node_label = _node_label(coverage.competency)
    return DiagnosticFinding(
        id=f"finding-graph-pending-{coverage.competency.id}",
        title=f"{coverage.competency.code} 存在待审核支撑关系",
        course=_course_from_edges(coverage.pending_edges),
        type=DiagnosticFindingType.STRUCTURAL_RISK,
        risk=DiagnosticFindingRisk.MEDIUM,
        source_node=_edge_source_summary(coverage.pending_edges),
        target_node=node_label,
        relation_label="SUPPORTS",
        graph_version=graph_version,
        rule_id="GRAPH-DIAG-PENDING-REVIEW",
        rule_version=GRAPH_RULE_VERSION,
        rule_kind="rules",
        rule_basis="AI 推荐关系必须经过教师审核后才可以进入正式图谱。",
        rule_rationale=(
            f"{node_label} 已有 {len(coverage.pending_edges)} 条待审核候选关系，"
            "但当前还不能计入覆盖率。建议进入 M4 检查源节点、目标指标点、支撑强度和证据。"
        ),
        rule_run_at=generated_at,
        decision_status=FindingDecisionStatus.PENDING,
        impact_course_objectives=1,
        impact_ability_nodes=1,
        impact_evaluation_inputs=len(coverage.pending_edges),
        suggested_destination="M4",
        evidence=tuple(_evidence_from_edges(coverage.pending_edges, graph_version)),
    )


def _weak_support_finding(
    coverage: CompetencyCoverage,
    graph_version: str,
    generated_at: str,
) -> DiagnosticFinding:
    node_label = _node_label(coverage.competency)
    return DiagnosticFinding(
        id=f"finding-graph-weak-{coverage.competency.id}",
        title=f"{coverage.competency.code} 支撑强度不足",
        course=_course_from_nodes(coverage.supporters),
        type=DiagnosticFindingType.COVERAGE_GAP,
        risk=DiagnosticFindingRisk.MEDIUM,
        source_node=_supporter_summary(coverage.supporters),
        target_node=node_label,
        relation_label="SUPPORTS",
        graph_version=graph_version,
        rule_id="GRAPH-DIAG-WEAK-SUPPORT",
        rule_version=GRAPH_RULE_VERSION,
        rule_kind="rules",
        rule_basis="指标点支撑强度累计值低于 strong 阈值时，不能视为稳定覆盖。",
        rule_rationale=(
            f"{node_label} 已有支撑关系，但累计强度为 {coverage.strength_score}，"
            "仍低于稳定覆盖阈值。建议补充更直接的评价材料，或在 M4/M2 修正支撑强度与证据说明。"
        ),
        rule_run_at=generated_at,
        decision_status=FindingDecisionStatus.PENDING,
        impact_course_objectives=1,
        impact_ability_nodes=1,
        impact_evaluation_inputs=max(1, len(coverage.approved_edges)),
        suggested_destination="M4",
        evidence=tuple(_evidence_from_edges(coverage.approved_edges, graph_version)),
    )


def _orphan_finding(
    node: AbilityGraphNode,
    graph_version: str,
    generated_at: str,
) -> DiagnosticFinding:
    node_label = _node_label(node)
    return DiagnosticFinding(
        id=f"finding-graph-orphan-{node.id}",
        title=f"{node.code} 未进入图谱支撑路径",
        course=str(node.properties.get("course") or "全专业"),
        type=DiagnosticFindingType.STRUCTURAL_RISK,
        risk=DiagnosticFindingRisk.LOW,
        source_node=node_label,
        target_node="未连接到毕业要求指标点",
        relation_label="UNMAPPED",
        graph_version=graph_version,
        rule_id="GRAPH-DIAG-ORPHAN-NODE",
        rule_version=GRAPH_RULE_VERSION,
        rule_kind="rules",
        rule_basis="学校侧课程、实验、知识点或资源节点需要进入至少一条图谱路径才可参与诊断和评价。",
        rule_rationale=(
            f"{node_label} 当前没有任何图谱关系。建议进入 M2 查看节点位置，"
            "或到 M4 建立该节点与对应指标点之间的支撑关系。"
        ),
        rule_run_at=generated_at,
        decision_status=FindingDecisionStatus.PENDING,
        impact_course_objectives=0,
        impact_ability_nodes=1,
        impact_evaluation_inputs=0,
        suggested_destination="M2",
        evidence=(
            DiagnosticEvidenceRef(
                id=f"evidence-{node.id}",
                object_name="正式能力图谱",
                object_version=graph_version,
                coordinate=node.code,
                excerpt=node.description or node.name,
                hash=f"graph:{node.id}",
            ),
        ),
    )


def _node_label(node: AbilityGraphNode) -> str:
    return f"{node.code} {node.name}".strip()


def _target_code(target_node: str) -> str:
    return target_node.split(" ", 1)[0] if target_node else ""


def _supporter_summary(nodes: tuple[AbilityGraphNode, ...]) -> str:
    if not nodes:
        return "未找到支撑源"
    return "、".join(_node_label(node) for node in nodes[:4])


def _edge_source_summary(edges: tuple[AbilityGraphEdge, ...]) -> str:
    if not edges:
        return "未找到支撑源"
    return "、".join(edge.source for edge in edges[:4])


def _course_from_nodes(nodes: tuple[AbilityGraphNode, ...]) -> str:
    for node in nodes:
        course = node.properties.get("course")
        if course:
            return str(course)
    return "全专业"


def _course_from_edges(edges: tuple[AbilityGraphEdge, ...]) -> str:
    for edge in edges:
        if edge.evidence_summary:
            return edge.evidence_summary.split("/", 1)[0].strip()
    return "全专业"


def _evidence_from_edges(
    edges: tuple[AbilityGraphEdge, ...],
    graph_version: str,
) -> list[DiagnosticEvidenceRef]:
    evidence: list[DiagnosticEvidenceRef] = []
    for edge in edges[:5]:
        evidence.append(
            DiagnosticEvidenceRef(
                id=f"evidence-{edge.id}",
                object_name=edge.candidate_id or edge.source,
                object_version=graph_version,
                coordinate=f"{edge.source} -> {edge.target}",
                excerpt=edge.evidence_summary or edge.ai_reasoning or "暂无证据摘要",
                hash=f"graph-edge:{edge.id}",
            )
        )
    return evidence
