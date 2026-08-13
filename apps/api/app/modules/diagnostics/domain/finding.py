from dataclasses import dataclass, field
from enum import StrEnum


class DiagnosticFindingType(StrEnum):
    COVERAGE_GAP = "coverage-gap"
    MATERIAL_CONFLICT = "material-conflict"
    STRUCTURAL_RISK = "structural-risk"
    VERSION_IMPACT = "version-impact"


class DiagnosticFindingRisk(StrEnum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class FindingDecisionStatus(StrEnum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    DISMISSED = "dismissed"
    CONVERTED = "converted"


@dataclass(frozen=True, slots=True)
class DiagnosticEvidenceRef:
    id: str
    object_name: str
    object_version: str
    coordinate: str
    excerpt: str
    hash: str
    resource_id: str = ""


@dataclass(frozen=True, slots=True)
class DiagnosticFinding:
    id: str
    title: str
    course: str
    type: DiagnosticFindingType
    risk: DiagnosticFindingRisk
    source_node: str
    target_node: str
    relation_label: str
    graph_version: str
    rule_id: str
    rule_version: str
    rule_kind: str
    rule_basis: str
    rule_rationale: str
    rule_run_at: str
    # 所属专业 ID（关联 Major 实体），用于专业级隔离；默认指向 seed 专业 major-eie
    major_id: str = "major-eie"
    decision_status: FindingDecisionStatus = FindingDecisionStatus.PENDING
    impact_course_objectives: int = 0
    impact_ability_nodes: int = 0
    impact_evaluation_inputs: int = 0
    suggested_destination: str = "M7"
    evidence: tuple[DiagnosticEvidenceRef, ...] = field(default_factory=tuple)
