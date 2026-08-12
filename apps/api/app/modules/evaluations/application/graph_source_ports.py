"""评价读取正式图谱所需的端口。

评价模块不直接依赖 ``teaching_graph``：它只声明"我需要一份已发布图谱快照"，
由 infra 适配器去满足，再由 ``factory`` 装配。这样跨模块知识集中在组合根，
而 application 仍然只依赖 domain 和自己的端口。
"""

from typing import Any, Protocol


class PublishedGraphRepository(Protocol):
    """提供当前生效的正式图谱快照。

    返回 None 表示尚无已发布版本——此时评价没有可用结构，而不是"结构为空"。
    """

    async def get_published_snapshot(self) -> dict[str, Any] | None: ...


class EvaluationPolicyRepository(Protocol):
    """提供当前评价策略版本（权重、阈值、缺失值口径）。"""

    async def get_active_policy(self) -> Any | None: ...


__all__ = ["EvaluationPolicyRepository", "PublishedGraphRepository"]
