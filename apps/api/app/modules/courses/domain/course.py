"""课程实体：教学操作的「工作台」维度。

专业是认证评判单元（覆盖率/达成度在专业层面汇总），课程是教师日常操作的工作台。
上传材料、审核关系、看达成度都按课程维度组织。
major_id 指向所属专业实体（Major），用于专业级聚合。
graph_node_id 指向能力图谱中对应的 Course 节点（如 co-mcu），用于联动。
"""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Course:
    id: str
    code: str  # 课程代码，如 B020012005；无代码时为空串
    name: str  # 课程名称
    credits: float | None = None  # 学分
    semester: str | None = None  # 开课学期，如 "2025春"
    major_id: str = "major-eie"  # 所属专业 ID（关联 Major 实体）
    description: str | None = None  # 课程简介
    graph_node_id: str | None = None  # 对应图谱节点 id（如 co-mcu），用于联动
