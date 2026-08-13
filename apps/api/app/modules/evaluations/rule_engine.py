"""Pure, versioned attainment rules independent from AI output."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

from app.modules.orchestration.domain.coverage import (
    COVERED_STRENGTH_THRESHOLD,
    MIN_DISTINCT_EVIDENCE_SOURCES,
    analyze_coverage,
)
from app.modules.orchestration.domain.models import AbilityGraph


@dataclass(frozen=True, slots=True)
class EvaluationRuleSet:
    version: str
    strong_weight: int = 3
    medium_weight: int = 2
    weak_weight: int = 1
    competency_covered_threshold: int = COVERED_STRENGTH_THRESHOLD
    minimum_distinct_evidence_sources: int = MIN_DISTINCT_EVIDENCE_SOURCES
    requirement_covered_rate: float = 0.8


@dataclass(frozen=True, slots=True)
class EvaluationItem:
    competency_code: str
    attainment: float
    status: str
    total_strength: int


@dataclass(frozen=True, slots=True)
class EvaluationRun:
    id: str
    rule_version: str
    input_snapshot_hash: str
    graph_version: str
    started_at: str
    items: tuple[EvaluationItem, ...]


def _snapshot_hash(graph: AbilityGraph, rules: EvaluationRuleSet) -> str:
    payload = {
        "rules": {
            "version": rules.version,
            "strong_weight": rules.strong_weight,
            "medium_weight": rules.medium_weight,
            "weak_weight": rules.weak_weight,
            "competency_covered_threshold": rules.competency_covered_threshold,
            "minimum_distinct_evidence_sources": rules.minimum_distinct_evidence_sources,
            "requirement_covered_rate": rules.requirement_covered_rate,
        },
        "nodes": [node.to_dict() for node in graph.nodes],
        "edges": [edge.to_dict() for edge in graph.edges],
    }
    encoded = json.dumps(payload, ensure_ascii=True, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def evaluate(graph: AbilityGraph, *, graph_version: str, rules: EvaluationRuleSet) -> EvaluationRun:
    """Create an auditable snapshot from the authoritative coverage rules."""
    report = analyze_coverage(
        graph,
        strength_weight={
            "strong": rules.strong_weight,
            "medium": rules.medium_weight,
            "weak": rules.weak_weight,
        },
        covered_strength_threshold=rules.competency_covered_threshold,
        min_distinct_evidence_sources=rules.minimum_distinct_evidence_sources,
        requirement_covered_rate=rules.requirement_covered_rate,
    )
    items: list[EvaluationItem] = []
    for competency in report.competencies:
        items.append(
            EvaluationItem(
                competency_code=competency.code,
                attainment=competency.attainment,
                status=competency.status,
                total_strength=competency.total_strength,
            )
        )
    return EvaluationRun(
        id=f"evaluation-{uuid4().hex[:12]}",
        rule_version=rules.version,
        input_snapshot_hash=_snapshot_hash(graph, rules),
        graph_version=graph_version,
        started_at=datetime.now(UTC).isoformat(),
        items=tuple(sorted(items, key=lambda item: item.competency_code)),
    )


