"""把复算过程渲染成人可读的核对单。

专业负责人需要的不是“通过/不通过”，而是能逐步对照的中间值，
因此报告必须展示分数合计、样本数、得分率和贡献值，而不只是最终达成度。
"""

from .model import GoldenSample
from .recompute import Mismatch, TargetComputation, compute_sample


def _format_optional(value: object) -> str:
    return "—" if value is None else str(value)


def render_sample_report(sample: GoldenSample) -> str:
    lines: list[str] = []
    context = sample.context
    policy = sample.policy

    lines.append(f"金标准样例：{sample.sample_id}")
    if sample.synthetic:
        lines.append("⚠ 合成样例：数据为虚构，仅用于验证结构与流程，不得用于认证材料。")
    lines.append(f"专业：{context.program}（{context.program_version}）")
    lines.append(f"课程：{context.course_code} {context.course_name}")
    lines.append(f"周期：{context.evaluation_cycle}    图谱版本：{context.graph_version}")
    lines.append(f"编制：{context.compiled_by}    {context.compiled_at}")
    lines.append("")
    lines.append(
        f"口径 {policy.policy_version}：方法={policy.method}  缺失={policy.missing_score}  "
        f"样本={policy.sample_basis}  舍入={policy.rounding}"
    )
    lines.append(
        f"小数位：得分率 {policy.score_rate_dp}  贡献值 {policy.contribution_dp}  "
        f"达成度 {policy.attainment_dp}"
    )
    lines.append("")

    students = sorted({record.student_ref for record in sample.scores})
    lines.append(f"图谱节点 {len(sample.nodes)} 个，正式关系 {len(sample.edges)} 条，"
                 f"学生样本 {len(students)} 人。")
    lines.append("")

    for target, computed in zip(sample.targets, compute_sample(sample), strict=True):
        lines.append("=" * 72)
        lines.append(
            f"评价对象 {target.target_id}："
            f"{target.course_outcome_id} → {target.performance_indicator_id}"
        )
        lines.append(f"达成阈值：{target.threshold}")
        if target.note:
            lines.append(f"备注：{target.note}")
        lines.append("")
        lines.append(
            f"{'评分项':<14}{'满分':>6}{'权重':>8}{'有效/缺失':>12}"
            f"{'分数合计':>12}{'得分率':>10}{'贡献值':>10}"
        )
        for criterion, item in zip(target.criteria, computed.criteria, strict=True):
            lines.append(
                f"{criterion.criterion_id:<14}"
                f"{criterion.max_score:>6}"
                f"{criterion.weight:>8}"
                f"{item.valid_sample_count:>6}/{item.missing_sample_count:<5}"
                f"{item.score_sum:>12}"
                f"{_format_optional(item.score_rate):>10}"
                f"{_format_optional(item.contribution):>10}"
            )
        lines.append("")
        lines.append(f"权重合计：{computed.weight_total}")
        if computed.ready:
            lines.append(f"达成度：{computed.attainment}    结论：{computed.outcome}")
        else:
            lines.append("达成度：—    结论：—（输入阻断，不等于未达成）")
            for blocker in computed.blockers:
                lines.append(f"  · 阻断：{blocker}")
        lines.append("")

    return "\n".join(lines)


def render_mismatches(mismatches: tuple[Mismatch, ...]) -> str:
    if not mismatches:
        return "人工结论与独立复算完全一致。"
    lines = [f"发现 {len(mismatches)} 处人工结论与独立复算不一致："]
    for item in mismatches:
        lines.append(
            f"  · [{item.target_id}] {item.field}：人工={item.expected}  复算={item.recomputed}"
        )
    return "\n".join(lines)


def render_computation_digest(computations: tuple[TargetComputation, ...]) -> str:
    parts = []
    for item in computations:
        value = "阻断" if not item.ready else str(item.attainment)
        parts.append(f"{item.target_id}={value}")
    return "  ".join(parts)
