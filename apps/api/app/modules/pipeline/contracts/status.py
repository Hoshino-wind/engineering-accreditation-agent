from pydantic import BaseModel


class PipelineStatusResponse(BaseModel):
    """Pipeline 全局进度响应，供前端进度条和引导组件消费。"""

    stage: str  # idle | uploading | extracting | reviewing | diagnosing | done
    progress: float  # 0-1
    message: str
    pendingReviewCount: int
    pendingRunReviewCount: int
    gapCount: int
    suggestionCount: int
    lastUpdated: str
