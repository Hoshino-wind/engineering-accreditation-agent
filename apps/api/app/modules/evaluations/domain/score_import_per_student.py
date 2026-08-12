"""逐生逐项评分导入。

汇总口径（``local-pilot-aggregate:v1``）只接收每个评分项的已得总分、应得总分和样本量。
这意味着“缺考剔除还是补零”这个决定发生在系统之外的表格里，系统既无法复核，
也无法把它纳入输入快照——于是“可复算”只覆盖了最后一步加权求和。

本模块接收原始分，由系统按**声明的**缺失值口径派生出汇总值，
并把原始分、满分和口径一起纳入内容摘要。这样同一批总分若来自不同的花名册或不同口径，
会得到不同的摘要，复核者可以据此发现差异。
"""

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

from .score_import_batch import (
    ScoreImportCandidateItem,
    canonical_decimal,
    require_opaque_id,
)

MissingScorePolicy = Literal["exclude", "zero", "block"]

SCORE_IMPORT_PER_STUDENT_PROFILE = "local-pilot-per-student:v1"
SCORE_IMPORT_PER_STUDENT_SCOPE = "local_pilot_per_student"

# 汇总口径沿用 6 位定标；逐生口径由调用方显式声明，因为舍入时机会改变最终达成度。
DEFAULT_SCORE_RATE_SCALE = 6
MIN_SCORE_RATE_SCALE = 1
MAX_SCORE_RATE_SCALE = 6


def quantize_score_rate(value: Decimal, scale: int) -> Decimal:
    return value.quantize(Decimal(1).scaleb(-scale), rounding=ROUND_HALF_UP)


@dataclass(frozen=True, slots=True)
class StudentScoreEntry:
    """一名学生在一个评分项上的原始分。

    ``raw_score`` 为 None 表示缺考或未提交。这是一个必须显式录入的事实：
    整行缺失无法与漏录区分，因此花名册一致性由 ``roster`` 检查负责。
    """

    student_ref: str
    raw_score: Decimal | None

    def __post_init__(self) -> None:
        require_opaque_id(self.student_ref, "学生代号")
        if self.raw_score is not None:
            canonical_decimal(self.raw_score)


@dataclass(frozen=True, slots=True)
class PerStudentScoreItem:
    input_id: str
    max_score: Decimal
    entries: tuple[StudentScoreEntry, ...]

    def __post_init__(self) -> None:
        require_opaque_id(self.input_id, "评分输入 ID")
        canonical_decimal(self.max_score)

    @property
    def student_refs(self) -> tuple[str, ...]:
        return tuple(entry.student_ref for entry in self.entries)

    @property
    def missing_student_refs(self) -> tuple[str, ...]:
        return tuple(
            entry.student_ref for entry in self.entries if entry.raw_score is None
        )

    @property
    def duplicate_student_refs(self) -> tuple[str, ...]:
        seen: set[str] = set()
        duplicates: set[str] = set()
        for ref in self.student_refs:
            if ref in seen:
                duplicates.add(ref)
            seen.add(ref)
        return tuple(sorted(duplicates))

    @property
    def out_of_range_student_refs(self) -> tuple[str, ...]:
        return tuple(
            sorted(
                entry.student_ref
                for entry in self.entries
                if entry.raw_score is not None
                and (entry.raw_score < 0 or entry.raw_score > self.max_score)
            )
        )


@dataclass(frozen=True, slots=True)
class PerStudentSource:
    """批次保留的逐生原始输入。

    原始分不仅要进摘要，还必须可读回：只有哈希而拿不到原始分，
    复核者无法重新推导汇总值，"可复算"就只剩下一个承诺。
    """

    items: tuple[PerStudentScoreItem, ...]
    missing_score_policy: MissingScorePolicy
    score_rate_scale: int

    def __post_init__(self) -> None:
        if not self.items:
            raise ValueError("逐生评分批次至少需要一个评分项")
        input_ids = [item.input_id for item in self.items]
        if len(set(input_ids)) != len(input_ids):
            raise ValueError("逐生评分批次不得包含重复评分输入")
        if not MIN_SCORE_RATE_SCALE <= self.score_rate_scale <= MAX_SCORE_RATE_SCALE:
            raise ValueError("得分率定标位数超出允许范围")


@dataclass(frozen=True, slots=True)
class PerStudentDerivation:
    """由原始分派生出的汇总值及其推导依据。

    ``candidate`` 会继续走汇总口径已有的记录生成、校验和摘要流程；
    其余字段保留推导过程，供校验检查和复核报告使用。
    """

    item: PerStudentScoreItem
    candidate: ScoreImportCandidateItem
    roster_count: int
    valid_count: int
    missing_count: int
    blockers: tuple[str, ...]


def derive_per_student_item(
    item: PerStudentScoreItem,
    policy: MissingScorePolicy,
) -> PerStudentDerivation:
    """按声明口径把原始分派生为汇总值。

    - ``exclude``：分母按有效样本缩小，缺考不计入；
    - ``zero``：缺考按 0 分计入，分母保持花名册规模；
    - ``block``：只要存在缺考就阻断，不允许系统替人做假设。
    """
    blockers: list[str] = []
    roster_count = len(item.entries)
    present = [entry.raw_score for entry in item.entries if entry.raw_score is not None]
    missing_count = roster_count - len(present)

    if roster_count == 0:
        blockers.append(f"{item.input_id} 没有任何学生评分行")
    if item.max_score <= 0:
        blockers.append(f"{item.input_id} 的满分必须大于零")
    if item.duplicate_student_refs:
        blockers.append(
            f"{item.input_id} 存在重复学生：{'、'.join(item.duplicate_student_refs)}"
        )
    if item.out_of_range_student_refs:
        blockers.append(
            f"{item.input_id} 存在超出 0 到满分区间的记录："
            f"{'、'.join(item.out_of_range_student_refs)}"
        )
    if policy == "block" and missing_count:
        blockers.append(
            f"{item.input_id} 存在 {missing_count} 条缺考记录，当前口径要求阻断"
        )

    # zero 口径把缺考补成 0 分并保留在分母里；exclude 与 block 只保留有效样本。
    effective = (
        [*present, *([Decimal(0)] * missing_count)]
        if policy == "zero"
        else list(present)
    )

    if not effective and not blockers:
        blockers.append(f"{item.input_id} 没有可用于计算的有效样本")

    if blockers:
        return PerStudentDerivation(
            item=item,
            candidate=ScoreImportCandidateItem(
                input_id=item.input_id,
                earned_points_total=None,
                possible_points_total=None,
                observed_student_count=None,
            ),
            roster_count=roster_count,
            valid_count=len(present),
            missing_count=missing_count,
            blockers=tuple(blockers),
        )

    observed = len(effective)
    return PerStudentDerivation(
        item=item,
        candidate=ScoreImportCandidateItem(
            input_id=item.input_id,
            earned_points_total=sum(effective, start=Decimal(0)),
            possible_points_total=item.max_score * observed,
            observed_student_count=observed,
        ),
        roster_count=roster_count,
        valid_count=len(present),
        missing_count=missing_count,
        blockers=(),
    )


def derive_per_student_items(
    items: tuple[PerStudentScoreItem, ...],
    policy: MissingScorePolicy,
) -> tuple[PerStudentDerivation, ...]:
    return tuple(derive_per_student_item(item, policy) for item in items)


__all__ = [
    "DEFAULT_SCORE_RATE_SCALE",
    "MAX_SCORE_RATE_SCALE",
    "MIN_SCORE_RATE_SCALE",
    "SCORE_IMPORT_PER_STUDENT_PROFILE",
    "SCORE_IMPORT_PER_STUDENT_SCOPE",
    "MissingScorePolicy",
    "PerStudentDerivation",
    "PerStudentScoreItem",
    "PerStudentSource",
    "StudentScoreEntry",
    "derive_per_student_item",
    "derive_per_student_items",
    "quantize_score_rate",
]
