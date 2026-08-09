from dataclasses import dataclass
from datetime import UTC, datetime

from app.modules.pipeline.application.ports import (
    CoverageStatusProvider,
    ResourceStatusProvider,
    ReviewStatusProvider,
    SuggestionStatusProvider,
)


@dataclass(slots=True)
class PipelineStatusResult:
    """Pipeline 全局进度（应用层输出，无框架依赖）。"""

    stage: str
    progress: float
    message: str
    pending_review_count: int
    pending_run_review_count: int
    gap_count: int
    suggestion_count: int
    last_updated: str


class GetPipelineStatus:
    """聚合各模块状态，输出 pipeline 全局进度。"""

    def __init__(
        self,
        resources: ResourceStatusProvider,
        review: ReviewStatusProvider,
        coverage: CoverageStatusProvider,
        suggestions: SuggestionStatusProvider,
    ) -> None:
        self._resources = resources
        self._review = review
        self._coverage = coverage
        self._suggestions = suggestions

    async def execute(self) -> PipelineStatusResult:
        extracting = await self._resources.get_extracting_count()
        total_resources = await self._resources.get_total_count()
        pending_review = await self._review.get_pending_review_count()
        pending_run_review = await self._review.get_pending_run_review_count()
        gaps = await self._coverage.get_gap_count()
        suggestions = await self._suggestions.get_open_suggestion_count()

        # 推断当前阶段
        if total_resources == 0:
            # 空系统：任何 gaps/suggestions 都是"毕业要求零节点覆盖"导致的假阳性，
            # 不应该引导用户去看诊断/改进。直接显示 idle，提示先上传材料。
            stage = "idle"
            progress = 0.0
            message = "上传一份培养方案或实验指导书，开始智能分析"
        elif extracting > 0:
            stage = "extracting"
            progress = 0.3
            message = f"正在提取 {extracting} 份材料..."
        elif pending_review > 0:
            stage = "reviewing"
            progress = 0.5
            if pending_run_review > 0:
                message = f"有 {pending_run_review} 条 AI 推断关系待审核，去智能体控制台处理"
            else:
                message = f"有 {pending_review} 条关系待审核"
        elif gaps > 0:
            stage = "diagnosing"
            progress = 0.7
            message = f"发现 {gaps} 个覆盖缺口"
        elif suggestions > 0:
            stage = "done"
            progress = 1.0
            message = f"已生成 {suggestions} 条改进建议"
        else:
            stage = "done"
            progress = 1.0
            message = "流程已完成"

        return PipelineStatusResult(
            stage=stage,
            progress=progress,
            message=message,
            pending_review_count=pending_review,
            pending_run_review_count=pending_run_review,
            gap_count=gaps,
            suggestion_count=suggestions,
            last_updated=datetime.now(UTC).isoformat(),
        )
