"""覆盖度 / 达成度分析（纯函数，移植自前端 analyzeCoverage 的规则）。

核心规则（与前端保持一致）：
- 仅 ``review_status == 'approved'`` 的边计入覆盖；``pending`` 边只标记待审核。
- 支撑强度权重 strong=3 / medium=2 / weak=1。
- 能力指标（Competency）：无任何支撑且无待审核 → gap；累计强度 >= 4，且至少有
  2 份不同材料的证据 → covered；其余 → partial。单份材料不能证明证据充分。
- 毕业要求（GraduationRequirement）：coverage_rate = 已覆盖能力指标数 / 能力指标总数；
  >= 0.8 → covered，> 0 → partial，否则 gap。
"""

from dataclasses import dataclass

from app.modules.orchestration.domain.models import (
    AbilityGraph,
    CompetencyCoverage,
    CoverageReport,
    GraphEdge,
    GraphNode,
    RequirementCoverage,
)

STRENGTH_WEIGHT: dict[str, int] = {"strong": 3, "medium": 2, "weak": 1}
COVERED_STRENGTH_THRESHOLD = 4
MIN_DISTINCT_EVIDENCE_SOURCES = 2
REQUIREMENT_COVERED_RATE = 0.8  # 毕业要求覆盖率阈值

_SUPPORT_KINDS = ("SUPPORTS",)


@dataclass(frozen=True)
class _ReqRef:
    code: str
    name: str


def _requirement_code_for_competency(
    competency: GraphNode,
    comp_to_req: dict[str, str],
    req_id_to_code: dict[str, str],
) -> str:
    """优先用 CONTAINS 边映射，回退到编号前缀（C-01-01 → GR-01）。"""
    req_id = comp_to_req.get(competency.id)
    if req_id is not None and req_id in req_id_to_code:
        return req_id_to_code[req_id]
    parts = competency.code.split("-")
    if len(parts) >= 2 and parts[0] == "C":
        return f"GR-{parts[1]}"
    return ""


def analyze_coverage(
    graph: AbilityGraph,
    *,
    strength_weight: dict[str, int] | None = None,
    covered_strength_threshold: int = COVERED_STRENGTH_THRESHOLD,
    min_distinct_evidence_sources: int = MIN_DISTINCT_EVIDENCE_SOURCES,
    requirement_covered_rate: float = REQUIREMENT_COVERED_RATE,
) -> CoverageReport:
    weights = strength_weight or STRENGTH_WEIGHT
    approved = graph.approved_edges()
    pending = [e for e in graph.edges if e.review_status == "pending"]

    competencies = [
        n for n in graph.nodes if n.origin == "standard" and n.kind == "Competency"
    ]
    requirements = [
        n for n in graph.nodes if n.origin == "standard" and n.kind == "GraduationRequirement"
    ]
    school_nodes = [n for n in graph.nodes if n.origin == "school"]

    # CONTAINS 边：source=毕业要求，target=能力指标
    comp_to_req: dict[str, str] = {}
    for edge in graph.edges:
        if edge.kind == "CONTAINS":
            comp_to_req[edge.target] = edge.source
    req_id_to_code = {req.id: req.code for req in requirements}

    def _node_name(node_id: str) -> str:
        node = graph.node_by_id(node_id)
        return node.name if node is not None else node_id

    def _material_identity(edge: GraphEdge) -> str | None:
        source_node = graph.node_by_id(edge.source)
        properties = source_node.properties if source_node is not None else {}
        value = (
            edge.material_version_group_id
            or properties.get("materialVersionGroupId")
            or edge.material_resource_id
            or properties.get("materialId")
        )
        return str(value).strip() if value else None

    # ── 能力指标覆盖 ──────────────────────────────────────
    comp_coverages: list[CompetencyCoverage] = []
    for comp in competencies:
        support_edges = [
            e for e in approved if e.target == comp.id and e.kind in _SUPPORT_KINDS
        ]
        pending_edges = [
            e for e in pending if e.target == comp.id and e.kind in _SUPPORT_KINDS
        ]
        strong = sum(1 for e in support_edges if e.strength == "strong")
        medium = sum(1 for e in support_edges if e.strength == "medium")
        weak = sum(1 for e in support_edges if e.strength == "weak")
        total_strength = sum(weights.get(e.strength or "", 0) for e in support_edges)
        evidence_sources = {
            source
            for edge in support_edges
            if (source := _material_identity(edge)) is not None
        }
        evidence_source_count = len(evidence_sources)
        supporters = sorted({_node_name(e.source) for e in support_edges})
        evidence = []
        for edge in support_edges:
            source_node = graph.node_by_id(edge.source)
            properties = source_node.properties if source_node is not None else {}
            evidence.append(
                {
                    "edgeId": edge.id,
                    "sourceNodeId": edge.source,
                    "sourceCode": source_node.code if source_node is not None else edge.source,
                    "sourceName": source_node.name if source_node is not None else edge.source,
                    "strength": edge.strength,
                    "weight": weights.get(edge.strength or "", 0),
                    "confidence": edge.confidence,
                    "reviewStatus": edge.review_status,
                    "reasoning": edge.reasoning,
                    "materialId": edge.material_resource_id or properties.get("materialId"),
                    "materialVersionGroupId": (
                        edge.material_version_group_id
                        or properties.get("materialVersionGroupId")
                    ),
                    "materialVersion": edge.material_version or properties.get("materialVersion"),
                    "materialName": (
                        edge.material_name
                        or properties.get("materialFileName")
                        or properties.get("materialName")
                    ),
                    "counted": True,
                    "countReason": "教师已审核通过，计入材料支撑强度；充分性还需满足多材料证据门槛。",
                }
            )
        has_pending = len(pending_edges) > 0

        if not support_edges and not has_pending:
            status = "gap"
        elif (
            total_strength >= covered_strength_threshold
            and evidence_source_count >= min_distinct_evidence_sources
        ):
            status = "covered"
        else:
            status = "partial"

        attainment = min(total_strength / covered_strength_threshold, 1.0)
        if evidence_source_count < min_distinct_evidence_sources:
            attainment = min(attainment, 0.75)
        req_code = _requirement_code_for_competency(comp, comp_to_req, req_id_to_code)
        comp_coverages.append(
            CompetencyCoverage(
                code=comp.code,
                name=comp.name,
                requirement_code=req_code,
                status=status,
                total_strength=total_strength,
                strong_count=strong,
                medium_count=medium,
                weak_count=weak,
                supporter_count=len(support_edges),
                evidence_source_count=evidence_source_count,
                has_pending_review=has_pending,
                attainment=attainment,
                supporters=supporters,
                evidence=evidence,
            )
        )

    # ── 毕业要求覆盖 ──────────────────────────────────────
    req_coverages: list[RequirementCoverage] = []
    for req in requirements:
        comps = [cc for cc in comp_coverages if cc.requirement_code == req.code]
        total_comps = len(comps)
        covered_comps = sum(1 for cc in comps if cc.status == "covered")
        supported_comps = sum(1 for cc in comps if cc.status != "gap")
        rate = (covered_comps / total_comps) if total_comps else 0.0
        if rate >= requirement_covered_rate:
            status = "covered"
        elif supported_comps > 0:
            status = "partial"
        else:
            status = "gap"

        supports_req_edges = [
            e for e in approved if e.target == req.id and e.kind == "SUPPORTS_REQ"
        ]
        supporting_courses = sorted({_node_name(e.source) for e in supports_req_edges})
        strong_support = sum(1 for e in supports_req_edges if e.strength == "strong")
        req_coverages.append(
            RequirementCoverage(
                code=req.code,
                name=req.name,
                status=status,
                coverage_rate=rate,
                competency_count=total_comps,
                covered_count=covered_comps,
                strong_support_count=strong_support,
                supporting_courses=supporting_courses,
            )
        )

    # ── 孤儿节点：未出现在任何 approved 边中的学校节点 ──────
    connected: set[str] = set()
    for edge in approved:
        connected.add(edge.source)
        connected.add(edge.target)
    orphan_count = sum(1 for n in school_nodes if n.id not in connected)

    covered_comp_count = sum(1 for cc in comp_coverages if cc.status == "covered")
    overall = (covered_comp_count / len(comp_coverages)) if comp_coverages else 0.0

    return CoverageReport(
        overall_coverage_rate=overall,
        gap_count=sum(1 for cc in comp_coverages if cc.status == "gap"),
        partial_count=sum(1 for cc in comp_coverages if cc.status == "partial"),
        covered_count=covered_comp_count,
        orphan_node_count=orphan_count,
        requirements=req_coverages,
        competencies=comp_coverages,
    )
