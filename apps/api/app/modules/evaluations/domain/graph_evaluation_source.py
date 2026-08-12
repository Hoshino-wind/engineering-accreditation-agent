"""从正式图谱快照派生评价结构。

在此之前，评价对象和评分输入来自 ``pilot_evaluation_read_model.json``——
一个手写的种子文件，其中 ``graph_version`` 只是一个字符串字面量。
于是"评价可追溯到图谱版本"是写在字段里的承诺，而不是活的链路。

本模块把这条链路接上：评价的**结构**（哪些评分项汇总到哪个课程目标）
只能来自图谱正式关系；评价的**权重与阈值**只能来自 M6 策略版本。
两者都不允许对方补写——这正是 ADR-001 第 5.1 节要求的分工。
"""

from dataclasses import dataclass
from decimal import Decimal
from typing import Any

# 派生只消费这三类正式关系；其余关系与评价结构无关。
SUPPORTS = "supports"
CONTRIBUTES_TO = "contributes-to"
EXPECTS = "expects"

COURSE_OUTCOME = "course-outcome"
PERFORMANCE_INDICATOR = "performance-indicator"
RUBRIC_CRITERION = "rubric-criterion"
COURSE = "course"
ABILITY = "ability"
DEFINES = "defines"

WEIGHT_TOLERANCE = Decimal("0.0001")


@dataclass(frozen=True, slots=True)
class GraphCriterionRef:
    """一个汇总到课程目标的正式评分项。"""

    criterion_id: str
    criterion_code: str
    label: str
    node_version_id: str
    edge_id: str
    edge_version_id: str
    effective_cycle: str
    evidence_name: str
    source_coordinate: str


@dataclass(frozen=True, slots=True)
class GraphEvaluationTarget:
    """一条"课程目标 → 指标点"的可评价路径。

    ``blockers`` 为空才代表图谱侧结构完整；权重是否齐备由策略绑定阶段判断。
    """

    course_outcome_id: str
    objective_code: str
    objective_name: str
    course_name: str
    indicator_code: str
    indicator_name: str
    ability_code: str
    ability_name: str
    criteria: tuple[GraphCriterionRef, ...]
    blockers: tuple[str, ...]

    @property
    def ready(self) -> bool:
        return not self.blockers


@dataclass(frozen=True, slots=True)
class GraphEvaluationStructure:
    graph_version: str
    schema_version_id: str
    published_at: str
    targets: tuple[GraphEvaluationTarget, ...]


def _effective(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [item for item in items if item.get("status") != "superseded"]


def _approved_edges(edges: list[dict[str, Any]], relation: str) -> list[dict[str, Any]]:
    # 只有已审核通过的关系可以进入评价；待审关系不构成正式事实。
    return [
        edge
        for edge in _effective(edges)
        if edge.get("relation") == relation and edge.get("reviewStatus") == "approved"
    ]


def _text(value: object) -> str:
    return str(value).strip() if value is not None else ""


def _evidence_name(node: dict[str, Any]) -> str:
    source = node.get("source") or {}
    material = _text(source.get("material"))
    version = _text(source.get("version"))
    if material and version:
        return f"{material} {version}"
    return material or version


def _criterion_ref(node: dict[str, Any], edge: dict[str, Any]) -> GraphCriterionRef:
    source = node.get("source") or {}
    return GraphCriterionRef(
        criterion_id=_text(node.get("id")),
        criterion_code=_text(node.get("code")),
        label=_text(node.get("name")),
        node_version_id=_text(node.get("nodeVersionId")),
        edge_id=_text(edge.get("id")),
        edge_version_id=_text(edge.get("edgeVersionId")),
        effective_cycle=_text(edge.get("effectiveCycle")),
        evidence_name=_evidence_name(node),
        source_coordinate=_text(source.get("coordinate")),
    )


def _resolve_ability(
    indicator_id: str,
    nodes_by_id: dict[str, dict[str, Any]],
    expects_edges: list[dict[str, Any]],
) -> dict[str, Any] | None:
    """沿 指标点 --expects--> 能力 取能力节点。

    最小本体子集里没有 ``ability`` 节点，此时返回 None，由调用方回落到指标点本身。
    这样同一段派生逻辑对完整本体和最小子集都成立，不必先冻结本体范围。
    """
    for edge in expects_edges:
        if _text(edge.get("sourceId")) != indicator_id:
            continue
        ability = nodes_by_id.get(_text(edge.get("targetId")))
        if ability is not None and ability.get("type") == ABILITY:
            return ability
    return None


def derive_evaluation_structure(snapshot: dict[str, Any]) -> GraphEvaluationStructure:
    """从一个已发布图谱快照派生全部可评价路径。"""
    nodes = _effective(list(snapshot.get("nodes", [])))
    edges = list(snapshot.get("edges", []))
    nodes_by_id = {_text(node.get("id")): node for node in nodes}

    supports = _approved_edges(edges, SUPPORTS)
    contributes = _approved_edges(edges, CONTRIBUTES_TO)
    expects = _approved_edges(edges, EXPECTS)
    defines = _approved_edges(edges, DEFINES)

    course_by_outcome: dict[str, str] = {}
    for edge in defines:
        course = nodes_by_id.get(_text(edge.get("sourceId")))
        if course is not None and course.get("type") == COURSE:
            course_by_outcome[_text(edge.get("targetId"))] = _text(course.get("name"))

    targets: list[GraphEvaluationTarget] = []
    for outcome in nodes:
        if outcome.get("type") != COURSE_OUTCOME:
            continue
        outcome_id = _text(outcome.get("id"))
        outcome_label = _text(outcome.get("code")) or outcome_id
        blockers: list[str] = []

        indicator = next(
            (
                nodes_by_id[_text(edge.get("targetId"))]
                for edge in supports
                if _text(edge.get("sourceId")) == outcome_id
                and _text(edge.get("targetId")) in nodes_by_id
                and nodes_by_id[_text(edge.get("targetId"))].get("type")
                == PERFORMANCE_INDICATOR
            ),
            None,
        )
        if indicator is None:
            blockers.append(f"课程目标 {outcome_label} 缺少 supports 指标点的正式关系")

        criteria: list[GraphCriterionRef] = []
        for edge in contributes:
            if _text(edge.get("targetId")) != outcome_id:
                continue
            criterion = nodes_by_id.get(_text(edge.get("sourceId")))
            if criterion is None or criterion.get("type") != RUBRIC_CRITERION:
                continue
            reference = _criterion_ref(criterion, edge)
            if not reference.evidence_name:
                blockers.append(
                    f"评分项 {reference.label or reference.criterion_id} 缺少来源材料"
                )
            criteria.append(reference)

        if not criteria:
            blockers.append(
                f"课程目标 {outcome_label} 没有任何评分项通过 contributes-to 汇总"
            )

        ability = (
            None
            if indicator is None
            else _resolve_ability(_text(indicator.get("id")), nodes_by_id, expects)
        )
        # 无 ability 节点时回落到指标点本身：最小本体子集不包含能力层。
        ability_source = ability or indicator or {}

        targets.append(
            GraphEvaluationTarget(
                course_outcome_id=outcome_id,
                objective_code=_text(outcome.get("code")),
                objective_name=_text(outcome.get("name")),
                course_name=course_by_outcome.get(outcome_id, ""),
                indicator_code=_text((indicator or {}).get("code")),
                indicator_name=_text((indicator or {}).get("name")),
                ability_code=_text(ability_source.get("code")),
                ability_name=_text(ability_source.get("name")),
                criteria=tuple(
                    sorted(criteria, key=lambda item: (item.criterion_code, item.criterion_id))
                ),
                blockers=tuple(dict.fromkeys(blockers)),
            )
        )

    return GraphEvaluationStructure(
        graph_version=_text(snapshot.get("version")),
        schema_version_id=_text(snapshot.get("schemaVersionId")),
        published_at=_text(snapshot.get("publishedAt")),
        targets=tuple(
            sorted(targets, key=lambda item: (item.objective_code, item.course_outcome_id))
        ),
    )


__all__ = [
    "GraphCriterionRef",
    "GraphEvaluationStructure",
    "GraphEvaluationTarget",
    "WEIGHT_TOLERANCE",
    "derive_evaluation_structure",
]
