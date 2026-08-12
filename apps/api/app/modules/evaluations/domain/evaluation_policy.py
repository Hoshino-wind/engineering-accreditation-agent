"""评价策略版本：权重、阈值与缺失值口径。

ADR-001 第 5.1 节把职责切开：

- 图谱回答"哪个评分项汇总到哪个课程目标"（``CONTRIBUTES_TO`` 正式关系）；
- 策略回答"各占多少权重、达标线是多少、缺考怎么算"。

因此改评价语义走 M2 新修订，改权重阈值走 M6 新策略版本，两者不互相补写。
策略绑定到**关系版本**而不是关系本身：图谱改了关系版本，旧绑定不会静默生效。
"""

from dataclasses import dataclass
from decimal import Decimal
from typing import Literal

from .graph_evaluation_source import (
    WEIGHT_TOLERANCE,
    GraphEvaluationStructure,
    GraphEvaluationTarget,
)
from .score_import_per_student import MissingScorePolicy

AttainmentMethod = Literal["mean_score_ratio", "passing_student_ratio"]


@dataclass(frozen=True, slots=True)
class EvaluationPolicyBinding:
    """把权重绑定到一条具体的 ``CONTRIBUTES_TO`` 关系版本。"""

    course_outcome_id: str
    criterion_id: str
    edge_version_id: str
    weight: Decimal

    def __post_init__(self) -> None:
        if self.weight < 0 or self.weight > 1:
            raise ValueError(f"评分项 {self.criterion_id} 的权重必须位于 0 到 1 之间")


@dataclass(frozen=True, slots=True)
class EvaluationPolicyVersion:
    policy_version: str
    method: AttainmentMethod
    missing_score: MissingScorePolicy
    score_rate_scale: int
    threshold: Decimal
    bindings: tuple[EvaluationPolicyBinding, ...]

    def __post_init__(self) -> None:
        if not self.policy_version or self.policy_version != self.policy_version.strip():
            raise ValueError("评价策略版本不能为空且不得包含首尾空白")
        if self.threshold < 0 or self.threshold > 1:
            raise ValueError("达成阈值必须位于 0 到 1 之间")
        if not 1 <= self.score_rate_scale <= 6:
            raise ValueError("得分率定标位数必须位于 1 到 6 之间")
        keys = [(item.course_outcome_id, item.criterion_id) for item in self.bindings]
        if len(set(keys)) != len(keys):
            raise ValueError("同一课程目标下的评分项权重绑定不得重复")

    def binding_for(
        self,
        course_outcome_id: str,
        criterion_id: str,
    ) -> EvaluationPolicyBinding | None:
        return next(
            (
                item
                for item in self.bindings
                if item.course_outcome_id == course_outcome_id
                and item.criterion_id == criterion_id
            ),
            None,
        )


@dataclass(frozen=True, slots=True)
class BoundCriterion:
    criterion_id: str
    label: str
    evidence_name: str
    edge_version_id: str
    weight: Decimal | None
    blockers: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class BoundEvaluationSource:
    """图谱结构 + 策略权重合成的评价输入来源。

    ``ready`` 为真时，该课程目标既有完整正式关系，也有闭合的权重配置，
    可以据此建立评价运行；否则 ``blockers`` 说明缺什么、该回哪个模块补。
    """

    course_outcome_id: str
    objective_code: str
    objective_name: str
    course_name: str
    indicator_code: str
    indicator_name: str
    ability_code: str
    ability_name: str
    graph_version: str
    policy_version: str
    threshold: Decimal
    criteria: tuple[BoundCriterion, ...]
    blockers: tuple[str, ...]

    @property
    def ready(self) -> bool:
        return not self.blockers


def bind_target(
    target: GraphEvaluationTarget,
    policy: EvaluationPolicyVersion,
    graph_version: str,
) -> BoundEvaluationSource:
    blockers = list(target.blockers)
    criteria: list[BoundCriterion] = []
    weight_total = Decimal(0)

    for reference in target.criteria:
        binding = policy.binding_for(target.course_outcome_id, reference.criterion_id)
        criterion_blockers: list[str] = []
        weight: Decimal | None = None

        if binding is None:
            criterion_blockers.append(
                f"评分项 {reference.label or reference.criterion_id} 在策略"
                f" {policy.policy_version} 中没有权重绑定"
            )
        elif binding.edge_version_id != reference.edge_version_id:
            # 关系版本变了而策略没跟上：静默沿用旧权重会让结论无法追溯。
            criterion_blockers.append(
                f"评分项 {reference.label or reference.criterion_id} 的权重绑定指向关系版本"
                f" {binding.edge_version_id}，当前正式关系版本为 {reference.edge_version_id}"
            )
        else:
            weight = binding.weight
            weight_total += weight

        blockers.extend(criterion_blockers)
        criteria.append(
            BoundCriterion(
                criterion_id=reference.criterion_id,
                label=reference.label,
                evidence_name=reference.evidence_name,
                edge_version_id=reference.edge_version_id,
                weight=weight,
                blockers=tuple(criterion_blockers),
            )
        )

    # 只有全部评分项都绑定成功才检查闭合；缺绑定时权重合计没有意义。
    fully_bound = bool(criteria) and all(item.weight is not None for item in criteria)
    if fully_bound and abs(weight_total - Decimal(1)) > WEIGHT_TOLERANCE:
        label = target.objective_code or target.course_outcome_id
        blockers.append(f"课程目标 {label} 的评分项权重合计为 {weight_total}，必须等于 1")

    return BoundEvaluationSource(
        course_outcome_id=target.course_outcome_id,
        objective_code=target.objective_code,
        objective_name=target.objective_name,
        course_name=target.course_name,
        indicator_code=target.indicator_code,
        indicator_name=target.indicator_name,
        ability_code=target.ability_code,
        ability_name=target.ability_name,
        graph_version=graph_version,
        policy_version=policy.policy_version,
        threshold=policy.threshold,
        criteria=tuple(criteria),
        blockers=tuple(dict.fromkeys(blockers)),
    )


def bind_evaluation_sources(
    structure: GraphEvaluationStructure,
    policy: EvaluationPolicyVersion,
) -> tuple[BoundEvaluationSource, ...]:
    return tuple(
        bind_target(target, policy, structure.graph_version) for target in structure.targets
    )


__all__ = [
    "AttainmentMethod",
    "BoundCriterion",
    "BoundEvaluationSource",
    "EvaluationPolicyBinding",
    "EvaluationPolicyVersion",
    "bind_evaluation_sources",
    "bind_target",
]
