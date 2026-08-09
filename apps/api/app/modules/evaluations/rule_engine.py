"""Pure, versioned attainment rules independent from AI output."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

from app.modules.orchestration.domain.models import AbilityGraph, GraphEdge


@dataclass(frozen=True, slots=True)
class EvaluationRuleSet:
    version: str
    strong_weight: int = 3
    medium_weight: int = 2
    weak_weight: int = 1
    competency_covered_threshold: int = 3
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
            "requirement_covered_rate": rules.requirement_covered_rate,
        },
        "nodes": [node.to_dict() for node in graph.nodes],
        "edges": [edge.to_dict() for edge in graph.edges],
    }
    encoded = json.dumps(payload, ensure_ascii=True, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def _strength(edge: GraphEdge, rules: EvaluationRuleSet) -> int:
    return {
        "strong": rules.strong_weight,
        "medium": rules.medium_weight,
        "weak": rules.weak_weight,
    }.get(edge.strength or "", 0)


def evaluate(graph: AbilityGraph, *, graph_version: str, rules: EvaluationRuleSet) -> EvaluationRun:
    """Evaluate approved support relations using a frozen, versioned rule set."""
    items: list[EvaluationItem] = []
    approved = [
        edge
        for edge in graph.edges
        if edge.kind == "SUPPORTS" and edge.review_status == "approved"
    ]
    for node in graph.nodes:
        if node.origin != "standard" or node.kind != "Competency":
            continue
        total = sum(_strength(edge, rules) for edge in approved if edge.target == node.id)
        attainment = min(total / rules.competency_covered_threshold, 1.0)
        status = "covered" if total >= rules.competency_covered_threshold else "gap"
        if 0 < total < rules.competency_covered_threshold:
            status = "partial"
        items.append(
            EvaluationItem(
                competency_code=node.code,
                attainment=attainment,
                status=status,
                total_strength=total,
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


