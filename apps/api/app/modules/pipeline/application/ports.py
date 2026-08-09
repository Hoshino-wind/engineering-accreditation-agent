from typing import Protocol


class ResourceStatusProvider(Protocol):
    """提供资源模块的聚合状态。"""

    async def get_extracting_count(self) -> int: ...

    async def get_total_count(self) -> int: ...


class ReviewStatusProvider(Protocol):
    """提供待审核关系的数量（识别候选与智能体运行推断边分开统计）。"""

    async def get_pending_review_count(self) -> int: ...

    async def get_pending_run_review_count(self) -> int: ...


class CoverageStatusProvider(Protocol):
    """提供覆盖度诊断的缺口数量。"""

    async def get_gap_count(self) -> int: ...


class SuggestionStatusProvider(Protocol):
    """提供改进建议的数量。"""

    async def get_open_suggestion_count(self) -> int: ...
