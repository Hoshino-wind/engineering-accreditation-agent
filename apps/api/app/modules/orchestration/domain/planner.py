"""默认规划器（确定性流水线 plan）。

Supervisor 智能体持有一份 plan，并按阶段路由到各专项智能体。这里提供一个稳健的默认
流水线计划；infra 层可用 LLM 对其增强/重规划，但即便没有 LLM，该默认计划也能驱动整个
多智能体协作流程跑通（保证 Demo 可运行）。
"""

from app.modules.orchestration.domain.models import AgentPhase

# 阶段 → (专项智能体名, 步骤标题)
PHASE_AGENTS: list[tuple[AgentPhase, str, str]] = [
    (AgentPhase.EXTRACT, "提取智能体", "解析教学材料，提取课程/实验/知识点节点"),
    (AgentPhase.INFER, "关系推理智能体", "推断学校节点对标准能力指标的支撑关系"),
    (AgentPhase.REVIEW, "人工审核网关", "教师审核 AI 推断的支撑关系（人在回路）"),
    (AgentPhase.COVERAGE, "覆盖度分析智能体", "基于已审核关系计算覆盖度与达成度"),
    (AgentPhase.DIAGNOSE, "诊断智能体", "为覆盖缺口生成诊断叙述"),
    (AgentPhase.IMPROVE, "改进智能体", "针对缺口生成可操作的改进建议"),
    (AgentPhase.REPORT, "报告智能体", "撰写自评报告章节"),
]


def default_plan(goal: str) -> list[str]:
    """根据目标生成默认的协作计划描述列表。"""
    return [
        f"目标：{goal}",
        "① 提取智能体解析上传材料，抽取教学节点",
        "② 关系推理智能体推断节点对标准能力指标的支撑关系",
        "③ 人工审核网关：教师审核 AI 推断的关系（仅 approved 计入覆盖）",
        "④ 覆盖度分析智能体计算覆盖度与达成度",
        "⑤ 诊断智能体为缺口生成诊断叙述",
        "⑥ 改进智能体生成改进建议",
        "⑦ 报告智能体撰写自评报告章节",
    ]
