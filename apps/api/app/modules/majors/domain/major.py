"""专业实体：认证评判的基本单元。

工程教育认证以「专业」为认证单位——认证结论是"该专业毕业生是否达到毕业要求"。
专业是课程、实验项目、教学资源的归属容器；评判（覆盖率、达成度）在专业层面汇总。
"""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Major:
    id: str
    code: str  # 专业代码，如 080701；无代码时为空串
    name: str  # 专业名称，如 "电子信息工程（嵌入式）"
    school_name: str  # 所属学校（MVP 阶段固定，后续可扩展为 School 实体）
    standard_version: str  # 认证标准版本，如 "2024"
    description: str | None = None  # 专业简介
