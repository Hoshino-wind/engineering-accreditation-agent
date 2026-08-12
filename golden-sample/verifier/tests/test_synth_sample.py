"""对仓库内合成样例的验收测试。

这些测试保护的是“尺子本身没坏”：样例可载入、自洽、且关键口径行为符合 ADR-001。
"""

from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

import pytest
from golden_sample import compare_with_expected, compute_sample, load_sample

SAMPLES_DIR = Path(__file__).resolve().parents[2] / "samples"
SYNTH_DIR = SAMPLES_DIR / "synth-001"


def test_every_repo_sample_is_self_consistent() -> None:
    directories = sorted(path for path in SAMPLES_DIR.iterdir() if (path / "sample.json").is_file())
    assert directories, "仓库内应至少保留一个合成样例"

    for directory in directories:
        sample = load_sample(directory)
        assert compare_with_expected(sample) == (), f"{directory.name} 的人工结论与独立复算不一致"


def test_repo_samples_are_all_synthetic() -> None:
    """仓库不保存真实教学材料与成绩，金标准样例同样适用这条纪律。"""
    for directory in SAMPLES_DIR.iterdir():
        if (directory / "sample.json").is_file():
            assert load_sample(directory).synthetic is True


def test_ready_target_matches_hand_calculation() -> None:
    sample = load_sample(SYNTH_DIR)
    computed = {item.target_id: item for item in compute_sample(sample)}

    ready = computed["TGT-CO2"]
    assert ready.ready is True
    assert ready.attainment == Decimal("0.749")
    assert ready.outcome == "achieved"
    assert ready.weight_total == Decimal("1.000")


def test_blocked_target_has_neither_attainment_nor_outcome() -> None:
    """ADR-001 第 8 节：输入阻断不是未达成，两者都不得投影为达成结论。"""
    sample = load_sample(SYNTH_DIR)
    computed = {item.target_id: item for item in compute_sample(sample)}

    blocked = computed["TGT-CO1"]
    assert blocked.ready is False
    assert blocked.attainment is None
    assert blocked.outcome is None
    assert blocked.blockers


def test_excluded_missing_score_shrinks_sample_but_not_numerator() -> None:
    """缺考按 exclude 剔除时，分母减一而不是补零——这两种口径结果不同。"""
    sample = load_sample(SYNTH_DIR)
    computed = {item.target_id: item for item in compute_sample(sample)}
    rc2 = next(
        item for item in computed["TGT-CO2"].criteria if item.criterion_id == "RC-2"
    )

    assert rc2.missing_sample_count == 1
    assert rc2.valid_sample_count == 7
    assert rc2.score_sum == Decimal("161")
    # 161 / 7 / 30 = 0.7666…；若按 zero 补零则为 161 / 8 / 30 = 0.6708…
    assert rc2.score_rate == Decimal("0.767")


def test_rounding_order_changes_the_published_number() -> None:
    """逐步舍入与末尾一次舍入会得到不同的达成度。

    这不是缺陷，而是必须被冻结的口径决策。金标准显式选择“逐步舍入”，
    本测试固定住两种口径的差值，防止实现悄悄改变舍入时机。
    """
    sample = load_sample(SYNTH_DIR)
    target = next(item for item in sample.targets if item.target_id == "TGT-CO2")
    rates = {"RC-1": Decimal("127") / 8 / 20, "RC-2": Decimal("161") / 7 / 30,
             "RC-3": Decimal("104") / 8 / 20}

    unrounded = sum(
        (rates[item.criterion_id] * item.weight for item in target.criteria),
        start=Decimal(0),
    ).quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)

    stepwise = next(
        item for item in compute_sample(sample) if item.target_id == "TGT-CO2"
    ).attainment

    assert stepwise == Decimal("0.749")
    assert unrounded == Decimal("0.748")
    assert stepwise != unrounded


def test_threshold_comparison_is_inclusive() -> None:
    """达成阈值取“大于等于”。边界口径必须由金标准而不是实现顺手决定。"""
    from golden_sample.recompute import compute_target

    sample = load_sample(SYNTH_DIR)
    target = next(item for item in sample.targets if item.target_id == "TGT-CO2")
    raised = type(target)(
        target_id=target.target_id,
        course_outcome_id=target.course_outcome_id,
        performance_indicator_id=target.performance_indicator_id,
        threshold=Decimal("0.749"),
        criteria=target.criteria,
        expected=target.expected,
    )

    assert compute_target(raised, sample).outcome == "achieved"


@pytest.mark.parametrize("filename", ["sample.json", "scores.csv"])
def test_sample_directory_layout(filename: str) -> None:
    assert (SYNTH_DIR / filename).is_file()
