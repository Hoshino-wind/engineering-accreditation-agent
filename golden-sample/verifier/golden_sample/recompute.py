"""按声明口径从原始分独立复算达成度。

这段实现刻意不引用 ``apps/api`` 的任何代码。金标准的作用是给系统当尺子，
如果尺子和被测对象共用同一份实现，比对结果永远为真，也就量不到任何东西。
"""

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

from .model import (
    Criterion,
    EvaluationTarget,
    FormulaPolicy,
    GoldenSample,
    ScoreRecord,
)


def _round(value: Decimal, places: int) -> Decimal:
    return value.quantize(Decimal(1).scaleb(-places), rounding=ROUND_HALF_UP)


@dataclass(frozen=True, slots=True)
class CriterionComputation:
    criterion_id: str
    valid_sample_count: int
    missing_sample_count: int
    score_sum: Decimal
    score_rate: Decimal | None
    contribution: Decimal | None
    blockers: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class TargetComputation:
    target_id: str
    ready: bool
    blockers: tuple[str, ...]
    attainment: Decimal | None
    outcome: str | None
    weight_total: Decimal
    criteria: tuple[CriterionComputation, ...]


def _effective_scores(
    records: tuple[ScoreRecord, ...],
    policy: FormulaPolicy,
) -> tuple[list[Decimal], int, tuple[str, ...]]:
    """按缺失值策略得出参与计算的分数集合。"""
    present = [record.raw_score for record in records if record.raw_score is not None]
    missing_count = len(records) - len(present)

    if missing_count == 0:
        return present, 0, ()
    if policy.missing_score == "exclude":
        return present, missing_count, ()
    if policy.missing_score == "zero":
        return present + [Decimal(0)] * missing_count, missing_count, ()
    return present, missing_count, (f"存在 {missing_count} 条缺失评分，当前口径要求阻断",)


def compute_criterion(
    criterion: Criterion,
    records: tuple[ScoreRecord, ...],
    policy: FormulaPolicy,
) -> CriterionComputation:
    blockers: list[str] = []

    if not records:
        return CriterionComputation(
            criterion_id=criterion.criterion_id,
            valid_sample_count=0,
            missing_sample_count=0,
            score_sum=Decimal(0),
            score_rate=None,
            contribution=None,
            blockers=(f"{criterion.label}缺少评分数据",),
        )

    over_range = [
        record.student_ref
        for record in records
        if record.raw_score is not None and record.raw_score > criterion.max_score
    ]
    if over_range:
        blockers.append(
            f"{criterion.label}存在超过满分的记录：{'、'.join(sorted(over_range))}"
        )

    effective, missing_count, missing_blockers = _effective_scores(records, policy)
    blockers.extend(missing_blockers)

    if not effective:
        blockers.append(f"{criterion.label}没有可用于计算的有效样本")

    score_sum = sum(effective, start=Decimal(0))

    if blockers:
        return CriterionComputation(
            criterion_id=criterion.criterion_id,
            valid_sample_count=len(effective),
            missing_sample_count=missing_count,
            score_sum=score_sum,
            score_rate=None,
            contribution=None,
            blockers=tuple(blockers),
        )

    if policy.method == "mean_score_ratio":
        mean = score_sum / Decimal(len(effective))
        raw_rate = mean / criterion.max_score
    else:
        assert policy.passing_score_ratio is not None  # 已由 FormulaPolicy 校验保证
        passing_line = criterion.max_score * policy.passing_score_ratio
        passed = sum(1 for score in effective if score >= passing_line)
        raw_rate = Decimal(passed) / Decimal(len(effective))

    score_rate = _round(raw_rate, policy.score_rate_dp)
    contribution = _round(score_rate * criterion.weight, policy.contribution_dp)

    return CriterionComputation(
        criterion_id=criterion.criterion_id,
        valid_sample_count=len(effective),
        missing_sample_count=missing_count,
        score_sum=score_sum,
        score_rate=score_rate,
        contribution=contribution,
        blockers=(),
    )


def compute_target(
    target: EvaluationTarget,
    sample: GoldenSample,
) -> TargetComputation:
    policy = sample.policy
    computations = tuple(
        compute_criterion(criterion, sample.scores_for(criterion.criterion_id), policy)
        for criterion in target.criteria
    )

    blockers: list[str] = []
    raw_weight_total = sum((item.weight for item in target.criteria), start=Decimal(0))
    weight_total = _round(raw_weight_total, policy.contribution_dp)

    # 权重按原始精度闭合，避免用显示精度掩盖录入误差。
    if abs(raw_weight_total - Decimal(1)) > policy.weight_tolerance:
        blockers.append(f"评分项权重合计为 {weight_total}，必须等于 1")

    for computation in computations:
        blockers.extend(computation.blockers)

    if blockers:
        return TargetComputation(
            target_id=target.target_id,
            ready=False,
            blockers=tuple(dict.fromkeys(blockers)),
            attainment=None,
            outcome=None,
            weight_total=weight_total,
            criteria=computations,
        )

    attainment = _round(
        sum(
            (item.contribution or Decimal(0) for item in computations),
            start=Decimal(0),
        ),
        policy.attainment_dp,
    )
    return TargetComputation(
        target_id=target.target_id,
        ready=True,
        blockers=(),
        attainment=attainment,
        outcome="achieved" if attainment >= target.threshold else "not_achieved",
        weight_total=weight_total,
        criteria=computations,
    )


def compute_sample(sample: GoldenSample) -> tuple[TargetComputation, ...]:
    return tuple(compute_target(target, sample) for target in sample.targets)


@dataclass(frozen=True, slots=True)
class Mismatch:
    target_id: str
    field: str
    expected: str
    recomputed: str


def compare_with_expected(sample: GoldenSample) -> tuple[Mismatch, ...]:
    """比对人工填写的结论与独立复算结果。

    这是金标准的自校验：如果两边不一致，说明人工结论、原始分或口径声明
    至少有一处是错的，此时这份样例还不能用作验收基准。
    """
    mismatches: list[Mismatch] = []

    def add(target_id: str, field: str, expected_value: object, actual_value: object) -> None:
        if expected_value != actual_value:
            mismatches.append(
                Mismatch(
                    target_id=target_id,
                    field=field,
                    expected=str(expected_value),
                    recomputed=str(actual_value),
                )
            )

    for target, computed in zip(sample.targets, compute_sample(sample), strict=True):
        expected = target.expected
        target_id = target.target_id

        add(target_id, "ready", expected.ready, computed.ready)
        add(target_id, "blockers", expected.blockers, computed.blockers)
        add(target_id, "weight_total", expected.weight_total, computed.weight_total)
        add(target_id, "attainment", expected.attainment, computed.attainment)
        add(target_id, "outcome", expected.outcome, computed.outcome)

        for expected_item, computed_item in zip(expected.criteria, computed.criteria, strict=True):
            prefix = f"criteria[{expected_item.criterion_id}]"
            add(target_id, f"{prefix}.valid_sample_count",
                expected_item.valid_sample_count, computed_item.valid_sample_count)
            add(target_id, f"{prefix}.missing_sample_count",
                expected_item.missing_sample_count, computed_item.missing_sample_count)
            add(target_id, f"{prefix}.score_sum",
                expected_item.score_sum, computed_item.score_sum)
            # 阻断项两侧都应为空；始终比对可以强制人工显式写出 null，而不是补零掩盖。
            add(target_id, f"{prefix}.score_rate",
                expected_item.score_rate, computed_item.score_rate)
            add(target_id, f"{prefix}.contribution",
                expected_item.contribution, computed_item.contribution)

    return tuple(mismatches)
