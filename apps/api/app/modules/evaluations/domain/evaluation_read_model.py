from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

ApprovalStatus = Literal[
    "not_submitted",
    "pending",
    "approved",
    "rejected",
]
ReadinessCheckStatus = Literal["pass", "blocked"]
AttainmentOutcome = Literal["achieved", "not_achieved"]

THREE_DECIMAL_PLACES = Decimal("0.001")
WEIGHT_TOLERANCE = Decimal("0.0001")


def _require_opaque_id(value: str, label: str) -> None:
    if not value or value != value.strip():
        raise ValueError(f"{label}不能为空且不得包含首尾空白")


def _require_ratio(value: Decimal, label: str) -> None:
    if value < 0 or value > 1:
        raise ValueError(f"{label}必须位于 0 到 1 之间")


def _round_three(value: Decimal) -> Decimal:
    return value.quantize(THREE_DECIMAL_PLACES, rounding=ROUND_HALF_UP)


@dataclass(frozen=True, slots=True)
class EvaluationObject:
    evaluation_object_id: str
    display_order: int
    course: str
    objective_code: str
    objective_name: str
    ability_code: str
    ability_name: str
    presented_run_id: str

    def __post_init__(self) -> None:
        _require_opaque_id(self.evaluation_object_id, "评价对象 ID")
        _require_opaque_id(self.presented_run_id, "展示运行 ID")
        if self.display_order < 1:
            raise ValueError("评价对象展示顺序必须为正整数")


@dataclass(frozen=True, slots=True)
class EvaluationInput:
    evidence_name: str
    input_id: str
    label: str
    score_rate: Decimal | None
    weight: Decimal

    def __post_init__(self) -> None:
        _require_opaque_id(self.input_id, "评价输入 ID")
        _require_ratio(self.weight, "评价输入权重")
        if self.score_rate is not None:
            _require_ratio(self.score_rate, "评价输入得分率")


@dataclass(frozen=True, slots=True)
class EvaluationReadinessCheck:
    detail: str
    check_id: str
    label: str
    status: ReadinessCheckStatus

    def __post_init__(self) -> None:
        _require_opaque_id(self.check_id, "就绪检查 ID")


@dataclass(frozen=True, slots=True)
class EvaluationEvidenceReference:
    coordinate: str
    digest: str
    evidence_id: str
    name: str
    version: str

    def __post_init__(self) -> None:
        _require_opaque_id(self.evidence_id, "证据引用 ID")


@dataclass(frozen=True, slots=True)
class EvaluationInputSnapshot:
    created_at: str
    digest: str


@dataclass(frozen=True, slots=True)
class EvaluationRunReadModel:
    run_id: str
    evaluation_object_id: str
    approval_status: ApprovalStatus
    graph_version: str
    policy_version: str
    program_version: str
    score_snapshot: str
    student_count: int
    threshold: Decimal
    input_snapshot: EvaluationInputSnapshot
    inputs: tuple[EvaluationInput, ...]
    readiness_checks: tuple[EvaluationReadinessCheck, ...]
    evidence: tuple[EvaluationEvidenceReference, ...]

    def __post_init__(self) -> None:
        _require_opaque_id(self.run_id, "评价运行 ID")
        _require_opaque_id(self.evaluation_object_id, "评价对象 ID")
        _require_ratio(self.threshold, "达成阈值")
        if self.student_count < 0:
            raise ValueError("样本数量不能为负数")
        if len({item.input_id for item in self.inputs}) != len(self.inputs):
            raise ValueError("同一评价运行的输入 ID 不得重复")
        if len({item.check_id for item in self.readiness_checks}) != len(
            self.readiness_checks
        ):
            raise ValueError("同一评价运行的就绪检查 ID 不得重复")
        if len({item.evidence_id for item in self.evidence}) != len(
            self.evidence
        ):
            raise ValueError("同一评价运行的证据引用 ID 不得重复")


@dataclass(frozen=True, slots=True)
class AttainmentResult:
    score: Decimal
    outcome: AttainmentOutcome

    def __post_init__(self) -> None:
        _require_ratio(self.score, "达成度结果")


@dataclass(frozen=True, slots=True)
class AttainmentContribution:
    evaluation_input: EvaluationInput
    value: Decimal | None

    def __post_init__(self) -> None:
        if self.value is not None and self.value < 0:
            raise ValueError("评价贡献值不能为负数")


@dataclass(frozen=True, slots=True)
class AttainmentCalculation:
    blockers: tuple[str, ...]
    contributions: tuple[AttainmentContribution, ...]
    ready: bool
    result: AttainmentResult | None
    weight_total: Decimal

    def __post_init__(self) -> None:
        if self.weight_total < 0:
            raise ValueError("评价权重合计不能为负数")
        if self.ready and (self.blockers or self.result is None):
            raise ValueError("就绪计算必须包含结果且不得包含阻断项")
        if not self.ready and self.result is not None:
            raise ValueError("阻断计算不得包含达成结果")


@dataclass(frozen=True, slots=True)
class EvaluationRunSnapshot:
    run: EvaluationRunReadModel
    calculation: AttainmentCalculation

    def __post_init__(self) -> None:
        contribution_inputs = tuple(
            item.evaluation_input
            for item in self.calculation.contributions
        )
        if contribution_inputs != self.run.inputs:
            raise ValueError("评价计算贡献必须与运行输入逐项一致")


@dataclass(frozen=True, slots=True)
class EvaluatedRun:
    evaluation_object: EvaluationObject
    run: EvaluationRunReadModel
    calculation: AttainmentCalculation
    source_run_id: str | None = None


def calculate_attainment(
    run: EvaluationRunReadModel,
) -> AttainmentCalculation:
    contributions = tuple(
        AttainmentContribution(
            evaluation_input=item,
            value=(
                None
                if item.score_rate is None
                else _round_three(item.score_rate * item.weight)
            ),
        )
        for item in run.inputs
    )
    raw_weight_total = sum(
        (item.weight for item in run.inputs),
        start=Decimal("0"),
    )
    weight_total = _round_three(raw_weight_total)
    blockers = dict.fromkeys(
        check.detail
        for check in run.readiness_checks
        if check.status == "blocked"
    )
    for item in run.inputs:
        if item.score_rate is None:
            blockers[f"{item.label}缺少有效得分率"] = None

    # 权重必须按原始精度闭合，不能用三位显示值掩盖输入误差。
    if abs(raw_weight_total - Decimal("1")) > WEIGHT_TOLERANCE:
        blockers[f"评分项权重合计为 {weight_total}，必须等于 1"] = None

    blocker_list = tuple(blockers)
    if blocker_list:
        return AttainmentCalculation(
            blockers=blocker_list,
            contributions=contributions,
            ready=False,
            result=None,
            weight_total=weight_total,
        )

    score = _round_three(
        sum(
            (
                contribution.value or Decimal("0")
                for contribution in contributions
            ),
            start=Decimal("0"),
        )
    )
    result = AttainmentResult(
        score=score,
        outcome="achieved" if score >= run.threshold else "not_achieved",
    )
    return AttainmentCalculation(
        blockers=(),
        contributions=contributions,
        ready=True,
        result=result,
        weight_total=weight_total,
    )
